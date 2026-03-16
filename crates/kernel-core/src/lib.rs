pub mod actions;
pub mod data;
pub mod hash;
pub mod types;

pub mod aab;
pub mod policy;

// Re-export key public API
pub use aab::{detect_git_action, is_destructive_command, normalize_intent};
pub use actions::{ActionClass, ActionType};
pub use hash::simple_hash;
pub use policy::evaluate;
pub use types::*;
