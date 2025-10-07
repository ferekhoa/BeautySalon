export const pad2 = (n) => String(n).padStart(2, '0');


export function toISODate(d) {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}


export function fmtTime(d) {
    const dt = new Date(d);
    return `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
}


export function overlaps(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && bStart < aEnd;
}


export function addMinutes(d, mins) {
    return new Date(new Date(d).getTime() + mins * 60000);
}