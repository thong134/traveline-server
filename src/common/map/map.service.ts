import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MapService {
  private readonly logger = new Logger(MapService.name);
  private readonly osrmBaseUrl = 'http://router.project-osrm.org/route/v1/driving';

  /**
   * Calculate travel distance between two points using OSRM
   * @returns Distance in kilometers
   */
  async getDistance(
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number,
  ): Promise<number> {
    try {
      const url = `${this.osrmBaseUrl}/${startLon},${startLat};${endLon},${endLat}?overview=false`;
      const response = await axios.get(url);

      if (response.data?.code !== 'Ok' || !response.data?.routes?.length) {
        this.logger.warn(`OSRM failed to find route: ${response.data?.code}`);
        // Fallback to Haversine if OSRM fails
        return this.calculateHaversineDistance(startLat, startLon, endLat, endLon);
      }

      // OSRM returns distance in meters
      const distanceMeters = response.data.routes[0].distance;
      return distanceMeters / 1000;
    } catch (error) {
      this.logger.error('Error calling OSRM API', error);
      // Fallback to Haversine
      return this.calculateHaversineDistance(startLat, startLon, endLat, endLon);
    }
  }

  /**
   * Straight-line distance using Haversine formula
   * @returns Distance in kilometers
   */
  calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
