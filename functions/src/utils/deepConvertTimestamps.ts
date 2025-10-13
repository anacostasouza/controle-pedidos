import { Timestamp } from "firebase-admin/firestore";

export function deepConvertTimestamps(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(deepConvertTimestamps);
  }
  if (obj && typeof obj === "object") {
    if (
      typeof obj.seconds === "number" &&
      typeof obj.nanoseconds === "number"
    ) {
      return Timestamp.fromMillis(
        obj.seconds * 1000 + Math.floor(obj.nanoseconds / 1000000)
      );
    }
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = deepConvertTimestamps(obj[key]);
    }
    return newObj;
  }
  return obj;
}