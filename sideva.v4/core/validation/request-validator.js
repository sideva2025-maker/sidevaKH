export function validateRequired(data, fields = []) {
    const missing = [];

    for (const field of fields) {
        if (
            data[field] === undefined ||
            data[field] === null ||
            data[field] === ''
        ) {
            missing.push(field);
        }
    }

    return {
        valid: missing.length === 0,
        missing
    };
}