import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { UpdateInitialProfileDto } from './update-initial-profile.dto';
import { UpdateVerificationInfoDto } from './update-verification-info.dto';
import { UpdateHobbiesDto } from './update-hobbies.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  // Add other fields that might be updated individually
  fullName?: string;
  gender?: string;
  address?: string;
  nationality?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  citizenId?: string;
  hobbies?: string[];
  travelPoint?: number;
  travelExp?: number;
  travelTrip?: number;
}
