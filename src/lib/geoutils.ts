


export class KalmanFilter {
  private r: number; 

  private q: number; 

  private a: number; 

  private p: number; 

  private x: number; 


  
  constructor(r: number = 0.01, q: number = 0.001) {
    this.r = r;
    this.q = q;
    this.a = 1;
    this.p = 1;
    this.x = NaN;
  }

  
  filter(measurement: number): number {
    if (Number.isNaN(this.x)) {
      this.x = measurement;
      this.p = 1;
      return this.x;
    }

    

    this.p = this.p + this.q;

    

    const k = this.p / (this.p + this.r);
    this.x = this.x + k * (measurement - this.x);
    this.p = (1 - k) * this.p;

    return this.x;
  }
}


export function getDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; 

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

  return R * c; 

}


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
