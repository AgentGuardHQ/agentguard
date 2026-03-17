use serde::{Deserialize, Serialize};

/// The 23 canonical action types plus Unknown.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ActionType {
    #[serde(rename = "file.read")]
    FileRead,
    #[serde(rename = "file.write")]
    FileWrite,
    #[serde(rename = "file.delete")]
    FileDelete,
    #[serde(rename = "file.move")]
    FileMove,
    #[serde(rename = "test.run")]
    TestRun,
    #[serde(rename = "test.run.unit")]
    TestRunUnit,
    #[serde(rename = "test.run.integration")]
    TestRunIntegration,
    #[serde(rename = "git.diff")]
    GitDiff,
    #[serde(rename = "git.commit")]
    GitCommit,
    #[serde(rename = "git.push")]
    GitPush,
    #[serde(rename = "git.branch.create")]
    GitBranchCreate,
    #[serde(rename = "git.branch.delete")]
    GitBranchDelete,
    #[serde(rename = "git.checkout")]
    GitCheckout,
    #[serde(rename = "git.reset")]
    GitReset,
    #[serde(rename = "git.merge")]
    GitMerge,
    #[serde(rename = "shell.exec")]
    ShellExec,
    #[serde(rename = "npm.install")]
    NpmInstall,
    #[serde(rename = "npm.script.run")]
    NpmScriptRun,
    #[serde(rename = "npm.publish")]
    NpmPublish,
    #[serde(rename = "http.request")]
    HttpRequest,
    #[serde(rename = "deploy.trigger")]
    DeployTrigger,
    #[serde(rename = "infra.apply")]
    InfraApply,
    #[serde(rename = "infra.destroy")]
    InfraDestroy,
    #[serde(rename = "unknown")]
    Unknown,
}

/// Action class -- the dot-prefix grouping.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ActionClass {
    File,
    Test,
    Git,
    Shell,
    Npm,
    Http,
    Deploy,
    Infra,
}

impl ActionType {
    /// Return the action class for this type.
    pub fn class(&self) -> ActionClass {
        match self {
            Self::FileRead | Self::FileWrite | Self::FileDelete | Self::FileMove => {
                ActionClass::File
            }
            Self::TestRun | Self::TestRunUnit | Self::TestRunIntegration => ActionClass::Test,
            Self::GitDiff
            | Self::GitCommit
            | Self::GitPush
            | Self::GitBranchCreate
            | Self::GitBranchDelete
            | Self::GitCheckout
            | Self::GitReset
            | Self::GitMerge => ActionClass::Git,
            Self::ShellExec => ActionClass::Shell,
            Self::NpmInstall | Self::NpmScriptRun | Self::NpmPublish => ActionClass::Npm,
            Self::HttpRequest => ActionClass::Http,
            Self::DeployTrigger => ActionClass::Deploy,
            Self::InfraApply | Self::InfraDestroy => ActionClass::Infra,
            Self::Unknown => ActionClass::Shell,
        }
    }

    /// Return the dot-delimited string form (e.g. "file.write").
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::FileRead => "file.read",
            Self::FileWrite => "file.write",
            Self::FileDelete => "file.delete",
            Self::FileMove => "file.move",
            Self::TestRun => "test.run",
            Self::TestRunUnit => "test.run.unit",
            Self::TestRunIntegration => "test.run.integration",
            Self::GitDiff => "git.diff",
            Self::GitCommit => "git.commit",
            Self::GitPush => "git.push",
            Self::GitBranchCreate => "git.branch.create",
            Self::GitBranchDelete => "git.branch.delete",
            Self::GitCheckout => "git.checkout",
            Self::GitReset => "git.reset",
            Self::GitMerge => "git.merge",
            Self::ShellExec => "shell.exec",
            Self::NpmInstall => "npm.install",
            Self::NpmScriptRun => "npm.script.run",
            Self::NpmPublish => "npm.publish",
            Self::HttpRequest => "http.request",
            Self::DeployTrigger => "deploy.trigger",
            Self::InfraApply => "infra.apply",
            Self::InfraDestroy => "infra.destroy",
            Self::Unknown => "unknown",
        }
    }

    /// Parse from the dot-delimited string form.
    pub fn from_str_opt(s: &str) -> Option<ActionType> {
        match s {
            "file.read" => Some(Self::FileRead),
            "file.write" => Some(Self::FileWrite),
            "file.delete" => Some(Self::FileDelete),
            "file.move" => Some(Self::FileMove),
            "test.run" => Some(Self::TestRun),
            "test.run.unit" => Some(Self::TestRunUnit),
            "test.run.integration" => Some(Self::TestRunIntegration),
            "git.diff" => Some(Self::GitDiff),
            "git.commit" => Some(Self::GitCommit),
            "git.push" => Some(Self::GitPush),
            "git.branch.create" => Some(Self::GitBranchCreate),
            "git.branch.delete" => Some(Self::GitBranchDelete),
            "git.checkout" => Some(Self::GitCheckout),
            "git.reset" => Some(Self::GitReset),
            "git.merge" => Some(Self::GitMerge),
            "shell.exec" => Some(Self::ShellExec),
            "npm.install" => Some(Self::NpmInstall),
            "npm.script.run" => Some(Self::NpmScriptRun),
            "npm.publish" => Some(Self::NpmPublish),
            "http.request" => Some(Self::HttpRequest),
            "deploy.trigger" => Some(Self::DeployTrigger),
            "infra.apply" => Some(Self::InfraApply),
            "infra.destroy" => Some(Self::InfraDestroy),
            "unknown" => Some(Self::Unknown),
            _ => None,
        }
    }

    /// All 24 variants (23 canonical + Unknown).
    pub fn all() -> &'static [ActionType] {
        &[
            Self::FileRead,
            Self::FileWrite,
            Self::FileDelete,
            Self::FileMove,
            Self::TestRun,
            Self::TestRunUnit,
            Self::TestRunIntegration,
            Self::GitDiff,
            Self::GitCommit,
            Self::GitPush,
            Self::GitBranchCreate,
            Self::GitBranchDelete,
            Self::GitCheckout,
            Self::GitReset,
            Self::GitMerge,
            Self::ShellExec,
            Self::NpmInstall,
            Self::NpmScriptRun,
            Self::NpmPublish,
            Self::HttpRequest,
            Self::DeployTrigger,
            Self::InfraApply,
            Self::InfraDestroy,
            Self::Unknown,
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_serde_roundtrip() {
        let json = serde_json::to_string(&ActionType::FileWrite).unwrap();
        assert_eq!(json, "\"file.write\"");
        let parsed: ActionType = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, ActionType::FileWrite);
    }

    #[test]
    fn test_all_24_variants() {
        assert_eq!(ActionType::all().len(), 24);
    }

    #[test]
    fn test_class_mapping() {
        assert_eq!(ActionType::FileWrite.class(), ActionClass::File);
        assert_eq!(ActionType::GitPush.class(), ActionClass::Git);
        assert_eq!(ActionType::ShellExec.class(), ActionClass::Shell);
        assert_eq!(ActionType::HttpRequest.class(), ActionClass::Http);
        assert_eq!(ActionType::NpmInstall.class(), ActionClass::Npm);
        assert_eq!(ActionType::DeployTrigger.class(), ActionClass::Deploy);
        assert_eq!(ActionType::InfraDestroy.class(), ActionClass::Infra);
        assert_eq!(ActionType::TestRun.class(), ActionClass::Test);
    }

    #[test]
    fn test_from_str() {
        assert_eq!(
            ActionType::from_str_opt("git.push"),
            Some(ActionType::GitPush)
        );
        assert_eq!(ActionType::from_str_opt("nonexistent"), None);
        assert_eq!(
            ActionType::from_str_opt("unknown"),
            Some(ActionType::Unknown)
        );
    }

    #[test]
    fn test_as_str() {
        assert_eq!(ActionType::GitBranchDelete.as_str(), "git.branch.delete");
        assert_eq!(
            ActionType::TestRunIntegration.as_str(),
            "test.run.integration"
        );
    }
}
