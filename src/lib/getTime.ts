export function getTime(seconds: number) {
    seconds = Math.round(seconds);

    if (typeof seconds !== "number" || isNaN(seconds)) {
        return "Invalid input";
    }

    // Calculate minutes and remaining seconds
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);

    // Format the result with leading zeros
    const formattedMinutes = String(minutes).padStart(1, "0");
    const formattedSeconds = String(remainingSeconds).padStart(2, "0");

    return `${formattedMinutes}:${formattedSeconds}`;
}

export function getDate(timeStamp: number) {
    const date = new Date(timeStamp);

    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "long" });
    const year = date.getFullYear();

    // Add suffix for the day
    const daySuffix = getDaySuffix(day);

    return `${day}${daySuffix} of ${month} of ${year}`;
}

function getDaySuffix(day: number) {
    if (day >= 11 && day <= 13) return "th"; // Special case for 11, 12, 13
    switch (day % 10) {
        case 1:
            return "st";
        case 2:
            return "nd";
        case 3:
            return "rd";
        default:
            return "th";
    }
}

export function getMinutes(seconds: number) {
    seconds = Math.round(seconds);

    if (typeof seconds !== "number" || isNaN(seconds)) {
        return "Invalid input";
    }

    // Calculate minutes and remaining seconds
    const minutes = Math.floor(seconds / 60);

    // Format the result with leading zeros
    const formattedMinutes = String(minutes).padStart(2, "0");

    return `${formattedMinutes}`;
}
