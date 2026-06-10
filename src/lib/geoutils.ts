/**
 * Geolocation Utilities for ClassTrack
 */

/**
 * Calculates the distance between two coordinates in meters using the Haversine formula.
 * @param lat1 Latitude of point 1 (Classroom)
 * @param lon1 Longitude of point 1 (Classroom)
 * @param lat2 Latitude of point 2 (Student)
 * @param lon2 Longitude of point 2 (Student)
 * @returns Distance in meters
 */
export function getDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

/**
 * Determines if a student is inside the geofence radius.
 * @param classroomLat Latitude of classroom
 * @param classroomLng Longitude of classroom
 * @param studentLat Latitude of student
 * @param studentLng Longitude of student
 * @param radiusInMeters Geofence radius in meters
 * @returns Boolean representing proximity status
 */
export function isInsideRadius(
  classroomLat: number,
  classroomLng: number,
  studentLat: number,
  studentLng: number,
  radiusInMeters: number
): boolean {
  const distance = getDistanceInMeters(
    classroomLat,
    classroomLng,
    studentLat,
    studentLng
  );
  return distance <= radiusInMeters;
}
