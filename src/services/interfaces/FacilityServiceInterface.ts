export interface FacilityServiceInterface {
  start(facilityId: string, h3Index: string): Promise<void>;

  stop(facilityId: string): Promise<void>;
}
