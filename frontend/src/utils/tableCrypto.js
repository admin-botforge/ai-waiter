// A simple obfuscation layer
const tableSecret = "VEG_CAFE_2026"; // Change this to any secret string

export const encodeTable = (num) => {
    // Converts "1" -> "Y2FmZV8wMQ=="
    return btoa(`cafe_${num}_${tableSecret}`).replace(/=/g, "");
};

export const decodeTable = (hash) => {
    try {
        const decoded = atob(hash);
        // Extracts the number between "cafe_" and "_VEG..."
        return decoded.split('_')[1];
    } catch (e) {
        return "01"; // Default to table 1 if someone messes with the hash
    }
};