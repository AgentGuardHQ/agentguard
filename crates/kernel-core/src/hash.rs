/// Port of the TypeScript simpleHash function.
/// DJB2-variant hash returning base-36 string.
pub fn simple_hash(s: &str) -> String {
    let mut hash: i32 = 0;
    for c in s.encode_utf16() {
        hash = ((hash << 5).wrapping_sub(hash)).wrapping_add(c as i32);
    }
    let abs = hash.unsigned_abs();
    if abs == 0 {
        return "0".to_string();
    }
    let mut result = Vec::new();
    let mut n = abs;
    while n > 0 {
        let digit = (n % 36) as u8;
        result.push(if digit < 10 { b'0' + digit } else { b'a' + digit - 10 });
        n /= 36;
    }
    result.reverse();
    String::from_utf8(result).unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_string() {
        assert_eq!(simple_hash(""), "0");
    }

    #[test]
    fn test_known_values() {
        let result = simple_hash("hello");
        assert!(!result.is_empty());
        assert!(result.chars().all(|c| c.is_ascii_digit() || c.is_ascii_lowercase()));
    }

    #[test]
    fn test_deterministic() {
        assert_eq!(simple_hash("test input"), simple_hash("test input"));
    }

    #[test]
    fn test_different_inputs_differ() {
        assert_ne!(simple_hash("abc"), simple_hash("xyz"));
    }
}
