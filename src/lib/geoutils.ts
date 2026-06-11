/**
 * Geolocation Utilities for ClassTrack
 */

/**
 * 1D Kalman Filter for smoothing GPS coordinates.
 * Helps eliminate sudden jumps and sensor noise.
 */
export class KalmanFilter {
  private r: number; // Noise covariance (how much we trust the measurement)
  private q: number; // Process covariance (how fast we expect the value to change)
  private a: number; // State vector
  private p: number; // Estimation error covariance
  private x: number; // Current estimation

  /**
   * @param r Sensor noise (higher = trust measurement less, smooth more) e.g., 0.01
   * @param q Process noise (higher = expect rapid changes, smooth less) e.g., 0.001
   */
  constructor(r: number = 0.01, q: number = 0.001) {
    this.r = r;
    this.q = q;
    this.a = 1;
    this.p = 1;
    this.x = NaN;
  }

  /**
   * Filter a new measurement.
   * @param measurement The new noisy coordinate value.
   * @returns The smoothed coordinate value.
   */
  filter(measurement: number): number {
    if (Number.isNaN(this.x)) {
      this.x = measurement;
      this.p = 1;
      return this.x;
    }

    // Prediction update
    this.p = this.p + this.q;

    // Measurement update
    const k = this.p / (this.p + this.r);
    this.x = this.x + k * (measurement - this.x);
    this.p = (1 - k) * this.p;

    return this.x;
  }
}

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
