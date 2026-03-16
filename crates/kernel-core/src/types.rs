use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// --- Agent Persona ---

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentPersona {
    pub trust_tier: Option<String>,
    pub role: Option<String>,
    pub autonomy: Option<String>,
    pub risk_tolerance: Option<String>,
    pub tags: Option<Vec<String>>,
}

// --- Raw Agent Action (input from adapters) ---

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawAgentAction {
    pub tool: Option<String>,
    pub command: Option<String>,
    pub file: Option<String>,
    pub target: Option<String>,
    pub content: Option<String>,
    pub branch: Option<String>,
    pub agent: Option<String>,
    pub persona: Option<AgentPersona>,
    pub files_affected: Option<u32>,
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

// --- Normalized Intent (output of AAB normalization) ---

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedIntent {
    pub action: String,
    pub target: String,
    pub agent: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub branch: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub command: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub files_affected: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<HashMap<String, serde_json::Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub persona: Option<AgentPersona>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub forecast: Option<IntentForecast>,
    pub destructive: bool,
}

// --- Intent Forecast ---

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IntentForecast {
    pub predicted_files: Vec<String>,
    pub dependencies_affected: Vec<String>,
    pub test_risk_score: f64,
    pub blast_radius_score: f64,
    pub risk_level: RiskLevel,
}

// --- Risk Level ---

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
}

// --- Effect ---

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Effect {
    Allow,
    Deny,
}

// --- Intervention ---

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Intervention {
    Deny,
    Pause,
    Modify,
    Rollback,
    #[serde(rename = "test-only")]
    TestOnly,
}

// --- Escalation Level ---

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum EscalationLevel {
    Normal,
    Elevated,
    High,
    Lockdown,
}

// --- Policy Types ---

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ActionPattern {
    Single(String),
    Multiple(Vec<String>),
}

impl ActionPattern {
    pub fn patterns(&self) -> Vec<&str> {
        match self {
            ActionPattern::Single(s) => vec![s.as_str()],
            ActionPattern::Multiple(v) => v.iter().map(|s| s.as_str()).collect(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersonaCondition {
    pub trust_tier: Option<Vec<String>>,
    pub role: Option<Vec<String>>,
    pub autonomy: Option<Vec<String>>,
    pub risk_tolerance: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ForecastCondition {
    pub test_risk_score: Option<f64>,
    pub blast_radius_score: Option<f64>,
    pub risk_level: Option<Vec<RiskLevel>>,
    pub predicted_file_count: Option<u32>,
    pub dependency_count: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PolicyConditions {
    pub scope: Option<Vec<String>>,
    pub limit: Option<f64>,
    pub branches: Option<Vec<String>>,
    pub require_tests: Option<bool>,
    pub require_format: Option<bool>,
    pub persona: Option<PersonaCondition>,
    pub forecast: Option<ForecastCondition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PolicyRule {
    pub action: ActionPattern,
    pub effect: Effect,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub conditions: Option<PolicyConditions>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub intervention: Option<Intervention>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadedPolicy {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub rules: Vec<PolicyRule>,
    pub severity: u8,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub persona: Option<AgentPersona>,
}

// --- Evaluation Result ---

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ForecastMatchValues {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub test_risk_score: Option<ThresholdMatch>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub blast_radius_score: Option<ThresholdMatch>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub risk_level: Option<RiskLevelMatch>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub predicted_file_count: Option<ThresholdMatch>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dependency_count: Option<ThresholdMatch>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThresholdMatch {
    pub actual: f64,
    pub threshold: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskLevelMatch {
    pub actual: RiskLevel,
    pub required: Vec<RiskLevel>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConditionDetails {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope_matched: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit_exceeded: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub branch_matched: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub persona_matched: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub forecast_matched: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub forecast_values: Option<ForecastMatchValues>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuleEvaluation {
    pub policy_id: String,
    pub policy_name: String,
    pub rule_index: u32,
    pub rule: PolicyRule,
    pub action_matched: bool,
    pub conditions_matched: bool,
    pub condition_details: ConditionDetails,
    pub outcome: RuleOutcome,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RuleOutcome {
    Match,
    NoMatch,
    Skipped,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PolicyEvaluationTrace {
    pub rules_evaluated: Vec<RuleEvaluation>,
    pub total_rules_checked: u32,
    pub phase_that_matched: Option<EvalPhase>,
    pub duration_ms: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EvalPhase {
    Deny,
    Allow,
    Default,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalResult {
    pub allowed: bool,
    pub decision: Effect,
    pub matched_rule: Option<PolicyRule>,
    pub matched_policy: Option<LoadedPolicy>,
    pub reason: String,
    pub severity: u8,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trace: Option<PolicyEvaluationTrace>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub policy_intervention: Option<Intervention>,
}

// --- Evaluate Options ---

#[derive(Debug, Clone)]
pub struct EvaluateOptions {
    pub default_deny: bool,
}

impl Default for EvaluateOptions {
    fn default() -> Self {
        Self { default_deny: true }
    }
}

// --- Violation ---

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Violation {
    pub invariant_id: String,
    pub name: String,
    pub severity: u8,
    pub expected: String,
    pub actual: String,
}

// --- Blast Radius ---

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BlastRadiusResult {
    pub raw_count: u32,
    pub weighted_score: f64,
    pub risk_level: RiskLevel,
    pub factors: Vec<BlastRadiusFactor>,
    pub threshold: Option<f64>,
    pub exceeded: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlastRadiusFactor {
    pub name: String,
    pub multiplier: f64,
    pub reason: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_raw_action_roundtrip() {
        let raw = RawAgentAction {
            tool: Some("Bash".into()),
            command: Some("git push origin main".into()),
            agent: Some("claude".into()),
            ..Default::default()
        };
        let json = serde_json::to_string(&raw).unwrap();
        let parsed: RawAgentAction = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.tool.as_deref(), Some("Bash"));
        assert_eq!(parsed.command.as_deref(), Some("git push origin main"));
    }

    #[test]
    fn test_effect_serde() {
        assert_eq!(serde_json::to_string(&Effect::Allow).unwrap(), "\"allow\"");
        assert_eq!(serde_json::to_string(&Effect::Deny).unwrap(), "\"deny\"");
    }

    #[test]
    fn test_risk_level_serde() {
        assert_eq!(serde_json::to_string(&RiskLevel::High).unwrap(), "\"high\"");
        let parsed: RiskLevel = serde_json::from_str("\"medium\"").unwrap();
        assert_eq!(parsed, RiskLevel::Medium);
    }

    #[test]
    fn test_intervention_serde() {
        assert_eq!(serde_json::to_string(&Intervention::TestOnly).unwrap(), "\"test-only\"");
    }

    #[test]
    fn test_escalation_ordering() {
        assert!(EscalationLevel::Normal < EscalationLevel::Elevated);
        assert!(EscalationLevel::Elevated < EscalationLevel::High);
        assert!(EscalationLevel::High < EscalationLevel::Lockdown);
    }

    #[test]
    fn test_action_pattern_single() {
        let p: ActionPattern = serde_json::from_str("\"git.push\"").unwrap();
        assert_eq!(p.patterns(), vec!["git.push"]);
    }

    #[test]
    fn test_action_pattern_multiple() {
        let p: ActionPattern = serde_json::from_str("[\"git.push\", \"git.merge\"]").unwrap();
        assert_eq!(p.patterns(), vec!["git.push", "git.merge"]);
    }

    #[test]
    fn test_normalized_intent_json_camel_case() {
        let intent = NormalizedIntent {
            action: "file.write".into(),
            target: "src/main.rs".into(),
            agent: "claude".into(),
            branch: None,
            command: None,
            files_affected: Some(3),
            metadata: None,
            persona: None,
            forecast: None,
            destructive: false,
        };
        let json = serde_json::to_string(&intent).unwrap();
        assert!(json.contains("\"filesAffected\":3"));
        assert!(!json.contains("files_affected"));
    }

    #[test]
    fn test_rule_outcome_serde() {
        assert_eq!(serde_json::to_string(&RuleOutcome::NoMatch).unwrap(), "\"no-match\"");
        assert_eq!(serde_json::to_string(&RuleOutcome::Match).unwrap(), "\"match\"");
        assert_eq!(serde_json::to_string(&RuleOutcome::Skipped).unwrap(), "\"skipped\"");
    }
}
