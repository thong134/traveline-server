import { RentalVehicleType } from '../../modules/rental-vehicle/enums/rental-vehicle.enum';

export interface ShippingFeeResult {
  fee: number;
  isNegotiable: boolean;
}

/**
 * Calculates shipping fee based on distance and vehicle type.
 * Consistency with RentalBillsService is required.
 * 
 * @param distance Road distance in km
 * @param vehicleType Type of vehicle (bike or car)
 */
export function calculateShippingFee(
  distance: number,
  vehicleType: RentalVehicleType,
): ShippingFeeResult {
  const isCar = vehicleType === RentalVehicleType.CAR;

  if (isCar) {
    if (distance <= 5) return { fee: 0, isNegotiable: false };
    if (distance <= 10) return { fee: 30000, isNegotiable: false };
    if (distance <= 20) return { fee: 60000, isNegotiable: false };
    return { fee: 0, isNegotiable: true };
  } else {
    // Bike/Motorcycle
    if (distance <= 3) return { fee: 0, isNegotiable: false };
    if (distance <= 7) return { fee: 15000, isNegotiable: false };
    if (distance <= 15) return { fee: 30000, isNegotiable: false };
    return { fee: 0, isNegotiable: true };
  }
}
