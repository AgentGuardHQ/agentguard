use regex::Regex;
use std::sync::LazyLock;

use crate::data::{DESTRUCTIVE_PATTERNS, GIT_ACTION_PATTERNS, TOOL_ACTION_MAP};
use crate::types::*;

static BRANCH_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\bgit\s+push\s+\S+\s+(\S+)").unwrap());

/// Detect git action type from a shell command string.
/// Returns the dot-delimited action type (e.g. "git.push") or None.
pub fn detect_git_action(command: &str) -> Option<&str> {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return None;
    }
    for entry in GIT_ACTION_PATTERNS.iter() {
        if entry.patterns.iter().any(|p| p.is_match(trimmed)) {
            return Some(&entry.action_type);
        }
    }
    None
}

/// Check if a shell command matches any destructive pattern.
pub fn is_destructive_command(command: &str) -> bool {
    if command.is_empty() {
        return false;
    }
    DESTRUCTIVE_PATTERNS
        .iter()
        .any(|p| p.pattern.is_match(command))
}

/// Extract target branch from a git push command.
pub fn extract_branch(command: &str) -> Option<String> {
    BRANCH_REGEX.captures(command).map(|c| c[1].to_string())
}

/// Normalize a raw agent action into a canonical NormalizedIntent.
///
/// Maps tool names to action types via TOOL_ACTION_MAP,
/// detects git actions from shell commands,
/// detects destructive commands,
/// and uses command as target for shell actions without explicit target.
pub fn normalize_intent(raw: Option<&RawAgentAction>) -> NormalizedIntent {
    let Some(raw) = raw else {
        return NormalizedIntent {
            action: "unknown".into(),
            target: String::new(),
            agent: "unknown".into(),
            branch: None,
            command: None,
            files_affected: None,
            metadata: None,
            persona: None,
            forecast: None,
            destructive: false,
        };
    };

    let tool = raw.tool.as_deref().unwrap_or("");
    let mut action = TOOL_ACTION_MAP
        .get(tool)
        .cloned()
        .unwrap_or_else(|| "unknown".into());
    let mut target = raw
        .file
        .clone()
        .or_else(|| raw.target.clone())
        .unwrap_or_default();

    if action == "shell.exec" {
        if let Some(ref cmd) = raw.command {
            if let Some(git_action) = detect_git_action(cmd) {
                action = git_action.to_string();
                target = extract_branch(cmd).unwrap_or(target);
            } else if target.is_empty() {
                target = cmd.clone();
            }
        }
    }

    let destructive =
        action == "shell.exec" && is_destructive_command(raw.command.as_deref().unwrap_or(""));

    NormalizedIntent {
        action,
        target,
        agent: raw.agent.clone().unwrap_or_else(|| "unknown".into()),
        branch: raw
            .branch
            .clone()
            .or_else(|| raw.command.as_deref().and_then(extract_branch)),
        command: raw.command.clone(),
        files_affected: raw.files_affected,
        metadata: raw.metadata.clone(),
        persona: raw.persona.clone(),
        forecast: None,
        destructive,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- Git detection ---

    #[test]
    fn test_detect_git_push() {
        assert_eq!(detect_git_action("git push origin main"), Some("git.push"));
    }

    #[test]
    fn test_detect_git_force_push() {
        assert_eq!(
            detect_git_action("git push --force origin main"),
            Some("git.force-push")
        );
        assert_eq!(
            detect_git_action("git push -f origin main"),
            Some("git.force-push")
        );
    }

    #[test]
    fn test_detect_git_branch_delete() {
        assert_eq!(
            detect_git_action("git branch -d feature"),
            Some("git.branch.delete")
        );
        assert_eq!(
            detect_git_action("git branch -D feature"),
            Some("git.branch.delete")
        );
    }

    #[test]
    fn test_detect_git_merge() {
        assert_eq!(detect_git_action("git merge feature"), Some("git.merge"));
    }

    #[test]
    fn test_detect_git_commit() {
        assert_eq!(
            detect_git_action("git commit -m 'msg'"),
            Some("git.commit")
        );
    }

    #[test]
    fn test_detect_non_git() {
        assert_eq!(detect_git_action("ls -la"), None);
        assert_eq!(detect_git_action(""), None);
    }

    // --- Destructive detection ---

    #[test]
    fn test_destructive_rm_rf() {
        assert!(is_destructive_command("rm -rf /"));
    }

    #[test]
    fn test_destructive_drop_table() {
        assert!(is_destructive_command("DROP TABLE users;"));
        assert!(is_destructive_command("drop table users;"));
    }

    #[test]
    fn test_destructive_sudo() {
        assert!(is_destructive_command("sudo rm important.txt"));
    }

    #[test]
    fn test_not_destructive() {
        assert!(!is_destructive_command("echo hello"));
        assert!(!is_destructive_command("ls -la"));
        assert!(!is_destructive_command("cat file.txt"));
    }

    // --- Branch extraction ---

    #[test]
    fn test_extract_branch() {
        assert_eq!(
            extract_branch("git push origin main"),
            Some("main".into())
        );
        assert_eq!(
            extract_branch("git push origin feature/test"),
            Some("feature/test".into())
        );
        assert_eq!(extract_branch("ls -la"), None);
    }

    // --- Normalize ---

    #[test]
    fn test_normalize_bash_tool() {
        let raw = RawAgentAction {
            tool: Some("Bash".into()),
            command: Some("echo hello".into()),
            ..Default::default()
        };
        let intent = normalize_intent(Some(&raw));
        assert_eq!(intent.action, "shell.exec");
        assert_eq!(intent.target, "echo hello");
    }

    #[test]
    fn test_normalize_git_push_via_bash() {
        let raw = RawAgentAction {
            tool: Some("Bash".into()),
            command: Some("git push origin main".into()),
            ..Default::default()
        };
        let intent = normalize_intent(Some(&raw));
        assert_eq!(intent.action, "git.push");
        assert_eq!(intent.target, "main");
    }

    #[test]
    fn test_normalize_write_tool() {
        let raw = RawAgentAction {
            tool: Some("Write".into()),
            file: Some("src/main.rs".into()),
            ..Default::default()
        };
        let intent = normalize_intent(Some(&raw));
        assert_eq!(intent.action, "file.write");
        assert_eq!(intent.target, "src/main.rs");
    }

    #[test]
    fn test_normalize_unknown_tool() {
        let raw = RawAgentAction {
            tool: Some("CustomTool".into()),
            ..Default::default()
        };
        let intent = normalize_intent(Some(&raw));
        assert_eq!(intent.action, "unknown");
    }

    #[test]
    fn test_normalize_null_input() {
        let intent = normalize_intent(None);
        assert_eq!(intent.action, "unknown");
        assert_eq!(intent.agent, "unknown");
        assert!(!intent.destructive);
    }

    #[test]
    fn test_normalize_destructive_command() {
        let raw = RawAgentAction {
            tool: Some("Bash".into()),
            command: Some("rm -rf /".into()),
            ..Default::default()
        };
        let intent = normalize_intent(Some(&raw));
        assert_eq!(intent.action, "shell.exec");
        assert!(intent.destructive);
    }

    #[test]
    fn test_normalize_preserves_persona() {
        let raw = RawAgentAction {
            tool: Some("Bash".into()),
            command: Some("echo hi".into()),
            persona: Some(AgentPersona {
                trust_tier: Some("high".into()),
                ..Default::default()
            }),
            ..Default::default()
        };
        let intent = normalize_intent(Some(&raw));
        assert_eq!(
            intent.persona.as_ref().unwrap().trust_tier.as_deref(),
            Some("high")
        );
    }

    #[test]
    fn test_normalize_shell_with_explicit_target() {
        let raw = RawAgentAction {
            tool: Some("Bash".into()),
            command: Some("npm test".into()),
            target: Some("package.json".into()),
            ..Default::default()
        };
        let intent = normalize_intent(Some(&raw));
        assert_eq!(intent.action, "shell.exec");
        assert_eq!(intent.target, "package.json"); // explicit target preserved
    }
}
