# API Messages Summary

Generated automatically by scripts/generate-api-summary.js.

## Module: auth

- API: POST /auth/signup
  - Function: signup
  - Conditions and Messages:
    - None found (No explicit message)

- API: POST /auth/login
  - Function: login
  - Conditions and Messages:
    - Condition: if (!user) throw new UnauthorizedException('Invalid credentials');
      Message: Invalid credentials

- API: POST /auth/refresh
  - Function: refresh
  - Conditions and Messages:
    - None found (No explicit message)

- API: POST /auth/request-reset
  - Function: requestReset
  - Conditions and Messages:
    - None found (No explicit message)

- API: POST /auth/reset-password
  - Function: resetPassword
  - Conditions and Messages:
    - None found (No explicit message)

- API: POST /auth/email/start
  - Function: emailStart
  - Conditions and Messages:
    - None found (No explicit message)

- API: POST /auth/email/verify
  - Function: emailVerify
  - Conditions and Messages:
    - None found (No explicit message)

- API: POST /auth/phone/start
  - Function: phoneStart
  - Conditions and Messages:
    - None found (No explicit message)

- API: POST /auth/phone/verify
  - Function: phoneVerify
  - Conditions and Messages:
    - None found (No explicit message)

- API: GET /auth/profile
  - Function: profile
  - Conditions and Messages:
    - None found (No explicit message)

- API: POST /auth/logout
  - Function: logout
  - Conditions and Messages:
    - None found (No explicit message)

- API: POST /auth/citizen-id/verify
  - Function: verifyCitizenId
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: onModuleInit
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: signup
  - Conditions and Messages:
    - Condition: if (existing) throw new ConflictException('Username already exists');
      Message: Username already exists

- API: Service / no explicit route
  - Function: validateUser
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: login
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: refresh
  - Conditions and Messages:
    - Condition: throw new UnauthorizedException('Invalid refresh token');
      Message: Invalid refresh token
    - Condition: throw new UnauthorizedException('Invalid refresh token');
      Message: Invalid refresh token

- API: Service / no explicit route
  - Function: startEmailVerification
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Vui l�ng di?n email tru?c khi x�c th?c');
      Message: Vui l�ng di?n email tru?c khi x�c th?c

- API: Service / no explicit route
  - Function: verifyEmailCode
  - Conditions and Messages:
    - Condition: throw new UnauthorizedException('M� x�c th?c kh�ng h?p l?');
      Message: M� x�c th?c kh�ng h?p l?
    - Condition: throw new UnauthorizedException('T�i kho?n kh�ng t?n t?i');
      Message: T�i kho?n kh�ng t?n t?i

- API: Service / no explicit route
  - Function: requestPasswordReset
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: resetPassword
  - Conditions and Messages:
    - Condition: throw new UnauthorizedException('M� x�c th?c kh�ng h?p l? ho?c d� h?t h?n');
      Message: M� x�c th?c kh�ng h?p l? ho?c d� h?t h?n
    - Condition: throw new UnauthorizedException('M� x�c th?c kh�ng h?p l?');
      Message: M� x�c th?c kh�ng h?p l?
    - Condition: throw new UnauthorizedException('T�i kho?n kh�ng t?n t?i');
      Message: T�i kho?n kh�ng t?n t?i

- API: Service / no explicit route
  - Function: startPhoneVerification
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Vui l�ng di?n s? di?n tho?i tru?c khi x�c th?c');
      Message: Vui l�ng di?n s? di?n tho?i tru?c khi x�c th?c
    - Condition: throw new BadRequestException('FIREBASE_API_KEY is not configured');
      Message: FIREBASE_API_KEY is not configured
    - Condition: throw new BadRequestException('recaptchaToken is required');
      Message: recaptchaToken is required
    - Condition: throw new UnauthorizedException('Firebase did not return sessionInfo');
      Message: Firebase did not return sessionInfo
    - Condition: throw new UnauthorizedException(message);
      Message: message
    - Condition: throw new UnauthorizedException('Failed to initiate phone verification');
      Message: Failed to initiate phone verification

- API: Service / no explicit route
  - Function: verifyPhoneCode
  - Conditions and Messages:
    - Condition: throw new BadRequestException('FIREBASE_API_KEY is not configured');
      Message: FIREBASE_API_KEY is not configured
    - Condition: throw new UnauthorizedException('Invalid or expired OTP');
      Message: Invalid or expired OTP
    - Condition: throw new UnauthorizedException(message);
      Message: message
    - Condition: throw new UnauthorizedException('Invalid verification code');
      Message: Invalid verification code

- API: Service / no explicit route
  - Function: logout
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: changePassword
  - Conditions and Messages:
    - Condition: throw new UnauthorizedException('M?t kh?u hi?n t?i kh�ng ch�nh x�c');
      Message: M?t kh?u hi?n t?i kh�ng ch�nh x�c

- API: Service / no explicit route
  - Function: updateProfile
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: verifyCitizenIdWithImages
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Vui lòng gửi ảnh mặt trước và mặt sau CCCD');
      Message: Vui lòng gửi ảnh mặt trước và mặt sau CCCD

- API: Service / no explicit route
  - Function: uploadAvatar
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: deleteImage
  - Conditions and Messages:
    - None found (No explicit message)

## Module: blockchain

- API: Service / no explicit route
  - Function: deployContract
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: deposit
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: adminDepositForRental
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: releaseFunds
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: adminReleaseFundsForRental
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: adminRefundForRental
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: refund
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: getRentalInfo
  - Conditions and Messages:
    - None found (No explicit message)

## Module: bus

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found
    - Condition: throw new NotFoundException(`Bus type ${dto.busTypeId} not found`);
      Message: Bus type ${dto.busTypeId} not found
    - Condition: throw new BadRequestException('At least one seat must be selected');
      Message: At least one seat must be selected
    - Condition: throw new NotFoundException(`Voucher ${dto.voucherCode} not found`);
      Message: Voucher ${dto.voucherCode} not found
    - Condition: throw new BadRequestException('Not enough travel points');
      Message: Not enough travel points
    - Condition: throw new BadRequestException('Total amount cannot be negative');
      Message: Total amount cannot be negative

- API: Service / no explicit route
  - Function: findAll
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Bus bill ${id} not found`);
      Message: Bus bill ${id} not found
    - Condition: throw new ForbiddenException('You do not have access to this bus bill');
      Message: You do not have access to this bus bill

- API: Service / no explicit route
  - Function: update
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: remove
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findAll
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Bus type ${id} not found`);
      Message: Bus type ${id} not found

- API: Service / no explicit route
  - Function: update
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: remove
  - Conditions and Messages:
    - None found (No explicit message)

## Module: category

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Category ${id} không tồn tại`);
      Message: Category ${id} không tồn tại

- API: Service / no explicit route
  - Function: update
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: remove
  - Conditions and Messages:
    - None found (No explicit message)

## Module: chatbot

- API: POST /chat
  - Function: handleChat
  - Conditions and Messages:
    - None found (No explicit message)

- API: POST /chat/classify-image
  - Function: classifyImage
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Vui lòng chọn ảnh để phân loại');
      Message: Vui lòng chọn ảnh để phân loại

- API: POST /chat/search-destinations
  - Function: searchDestinations
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: handleDestinationSearchApi
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: handleChat
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Message must not be empty');
      Message: Message must not be empty

- API: Service / no explicit route
  - Function: generateConversationalReply
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Invalid image payload.');
      Message: Invalid image payload.
    - Condition: throw new BadRequestException('Unable to fetch image from provided URL.');
      Message: Unable to fetch image from provided URL.
    - Condition: throw new InternalServerErrorException('Failed to download image.');
      Message: Failed to download image.
    - Condition: throw new BadRequestException('User not found');
      Message: User not found

- API: Service / no explicit route
  - Function: classifyImageOnly
  - Conditions and Messages:
    - Condition: throw new InternalServerErrorException(error.message);
      Message: error.message

## Module: cooperation

- API: POST /cooperations/:id/favorite
  - Function: favorite
  - Conditions and Messages:
    - None found (No explicit message)

- API: DELETE /cooperations/:id/favorite
  - Function: unfavorite
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${dto.userId} not found`);
      Message: User ${dto.userId} not found

- API: Service / no explicit route
  - Function: findAll
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Cooperation ${id} not found`);
      Message: Cooperation ${id} not found

- API: Service / no explicit route
  - Function: update
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${dto.userId} not found`);
      Message: User ${dto.userId} not found

- API: Service / no explicit route
  - Function: remove
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: adjustBookingMetrics
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Cooperation ${id} not found`);
      Message: Cooperation ${id} not found

- API: Service / no explicit route
  - Function: findFavoritesByUser
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found

- API: Service / no explicit route
  - Function: favorite
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found
    - Condition: throw new NotFoundException(`Cooperation ${cooperationId} not found`);
      Message: Cooperation ${cooperationId} not found

- API: Service / no explicit route
  - Function: unfavorite
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found

- API: Service / no explicit route
  - Function: getHotelAvailability
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Cooperation ${cooperationId} not found`);
      Message: Cooperation ${cooperationId} not found
    - Condition: throw new BadRequestException('checkIn must be before checkOut');
      Message: checkIn must be before checkOut

## Module: delivery

- API: Service / no explicit route
  - Function: checkTimeouts
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - Condition: if (!user) throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found
    - Condition: if (!vehicle) throw new NotFoundException('Delivery vehicle not found');
      Message: Delivery vehicle not found

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: if (!bill) throw new NotFoundException(`Delivery bill ${id} not found`);
      Message: Delivery bill ${id} not found
    - Condition: if (bill.user?.id !== userId) throw new ForbiddenException('Forbidden');
      Message: Forbidden

- API: Service / no explicit route
  - Function: update
  - Conditions and Messages:
    - Condition: throw new BadRequestException(`Cannot update bill in ${bill.status} status`);
      Message: Cannot update bill in ${bill.status} status
    - Condition: if (!voucher) throw new NotFoundException('Voucher not found');
      Message: Voucher not found
    - Condition: throw new BadRequestException('travelPointsUsed must be a non-negative number');
      Message: travelPointsUsed must be a non-negative number
    - Condition: throw new BadRequestException(`Bạn không đủ điểm (Hiện có: ${bill.user.travelPoint})`);
      Message: `Bạn không đủ điểm (Hiện có: ${bill.user.travelPoint}

- API: Service / no explicit route
  - Function: confirm
  - Conditions and Messages:
    - Condition: if (bill.status !== DeliveryBillStatus.PENDING) throw new BadRequestException('Not pending');
      Message: Not pending
    - Condition: throw new BadRequestException('Contact info required');
      Message: Contact info required

- API: Service / no explicit route
  - Function: pay
  - Conditions and Messages:
    - Condition: if (bill.status !== DeliveryBillStatus.CONFIRMED) throw new BadRequestException('Not confirmed');
      Message: Not confirmed

- API: Service / no explicit route
  - Function: complete
  - Conditions and Messages:
    - Condition: if (bill.status !== DeliveryBillStatus.IN_TRANSIT) throw new BadRequestException('Not in transit');
      Message: Not in transit

- API: Service / no explicit route
  - Function: cancel
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Finished');
      Message: Finished

- API: Service / no explicit route
  - Function: findAll
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findAll
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Delivery vehicle ${id} not found`);
      Message: Delivery vehicle ${id} not found

- API: Service / no explicit route
  - Function: update
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: remove
  - Conditions and Messages:
    - None found (No explicit message)

## Module: destination

- API: POST /destinations/:id/favorite
  - Function: favorite
  - Conditions and Messages:
    - None found (No explicit message)

- API: DELETE /destinations/:id/favorite
  - Function: unfavorite
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findAll
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Địa điểm #${id} không tồn tại`);
      Message: Địa điểm #${id} không tồn tại

- API: Service / no explicit route
  - Function: update
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: remove
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findFavoritesByUser
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found

- API: Service / no explicit route
  - Function: favorite
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found
    - Condition: throw new NotFoundException(`Destination ${destinationId} not found`);
      Message: Destination ${destinationId} not found

- API: Service / no explicit route
  - Function: unfavorite
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found

- API: Service / no explicit route
  - Function: recommendForUser
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found

- API: Service / no explicit route
  - Function: inspectRecommendation
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found

## Module: eatery

- API: POST /eateries/:id/favorite
  - Function: favorite
  - Conditions and Messages:
    - None found (No explicit message)

- API: DELETE /eateries/:id/favorite
  - Function: unfavorite
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findAll
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: randomByProvince
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Eatery ${id} không tồn tại`);
      Message: Eatery ${id} không tồn tại

- API: Service / no explicit route
  - Function: update
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: remove
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findFavoritesByUser
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found

- API: Service / no explicit route
  - Function: favorite
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found
    - Condition: throw new NotFoundException(`Eatery ${eateryId} not found`);
      Message: Eatery ${eateryId} not found

- API: Service / no explicit route
  - Function: unfavorite
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found

## Module: feedback

- API: Service / no explicit route
  - Function: checkContent
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found

- API: Service / no explicit route
  - Function: coordinateModeration
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findAll
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Feedback ${id} not found`);
      Message: Feedback ${id} not found

- API: Service / no explicit route
  - Function: remove
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Feedback ${id} not found`);
      Message: Feedback ${id} not found

- API: Service / no explicit route
  - Function: findByObject
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: getAuthorForService
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: addReaction
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Feedback ${feedbackId} not found`);
      Message: Feedback ${feedbackId} not found
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found

- API: Service / no explicit route
  - Function: removeReaction
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: listReactions
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: createReply
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Feedback ${feedbackId} not found`);
      Message: Feedback ${feedbackId} not found
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found

- API: Service / no explicit route
  - Function: listReplies
  - Conditions and Messages:
    - None found (No explicit message)

## Module: flight

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found
    - Condition: throw new NotFoundException(`Flight ${dto.flightId} not found`);
      Message: Flight ${dto.flightId} not found
    - Condition: throw new BadRequestException('At least one passenger is required');
      Message: At least one passenger is required
    - Condition: throw new NotFoundException(`Voucher ${dto.voucherCode} not found`);
      Message: Voucher ${dto.voucherCode} not found
    - Condition: throw new BadRequestException('Not enough travel points');
      Message: Not enough travel points
    - Condition: throw new BadRequestException('Total amount cannot be negative');
      Message: Total amount cannot be negative

- API: Service / no explicit route
  - Function: findAll
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Flight bill ${id} not found`);
      Message: Flight bill ${id} not found

- API: Service / no explicit route
  - Function: update
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Flight ${dto.flightId} not found`);
      Message: Flight ${dto.flightId} not found
    - Condition: throw new BadRequestException('At least one passenger is required');
      Message: At least one passenger is required
    - Condition: throw new NotFoundException(`Voucher ${dto.voucherCode} not found`);
      Message: Voucher ${dto.voucherCode} not found
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found
    - Condition: throw new BadRequestException('Not enough travel points');
      Message: Not enough travel points
    - Condition: throw new BadRequestException('Total amount cannot be negative');
      Message: Total amount cannot be negative

- API: Service / no explicit route
  - Function: remove
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - Condition: throw new BadRequestException('durationMinutes must be non-negative');
      Message: durationMinutes must be non-negative
    - Condition: throw new BadRequestException('arrivalTime must be after departureTime');
      Message: arrivalTime must be after departureTime

- API: Service / no explicit route
  - Function: findAll
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Flight ${id} not found`);
      Message: Flight ${id} not found

- API: Service / no explicit route
  - Function: update
  - Conditions and Messages:
    - Condition: throw new BadRequestException('durationMinutes must be non-negative');
      Message: durationMinutes must be non-negative
    - Condition: throw new BadRequestException('arrivalTime must be after departureTime');
      Message: arrivalTime must be after departureTime

- API: Service / no explicit route
  - Function: remove
  - Conditions and Messages:
    - None found (No explicit message)

## Module: hotel

- API: Service / no explicit route
  - Function: checkTimeouts
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - Condition: if (!user) throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found
    - Condition: throw new BadRequestException('checkOutDate must be after checkInDate');
      Message: checkOutDate must be after checkInDate
    - Condition: throw new NotFoundException('Some rooms were not found');
      Message: Some rooms were not found
    - Condition: throw new BadRequestException('All rooms must belong to the same cooperation');
      Message: All rooms must belong to the same cooperation

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: if (!bill) throw new NotFoundException(`Hotel bill ${id} not found`);
      Message: Hotel bill ${id} not found
    - Condition: if (bill.user?.id !== userId) throw new ForbiddenException('Forbidden');
      Message: Forbidden

- API: Service / no explicit route
  - Function: update
  - Conditions and Messages:
    - Condition: throw new BadRequestException(`Cannot update bill in ${bill.status} status`);
      Message: Cannot update bill in ${bill.status} status
    - Condition: if (!voucher) throw new NotFoundException('Voucher not found');
      Message: Voucher not found
    - Condition: throw new BadRequestException('travelPointsUsed must be a non-negative number');
      Message: travelPointsUsed must be a non-negative number
    - Condition: throw new BadRequestException(`Bạn không đủ điểm (Hiện có: ${bill.user.travelPoint})`);
      Message: `Bạn không đủ điểm (Hiện có: ${bill.user.travelPoint}

- API: Service / no explicit route
  - Function: confirm
  - Conditions and Messages:
    - Condition: if (bill.status !== HotelBillStatus.PENDING) throw new BadRequestException('Not pending');
      Message: Not pending
    - Condition: throw new BadRequestException('Contact info required');
      Message: Contact info required

- API: Service / no explicit route
  - Function: pay
  - Conditions and Messages:
    - Condition: if (bill.status !== HotelBillStatus.CONFIRMED) throw new BadRequestException('Not confirmed');
      Message: Not confirmed

- API: Service / no explicit route
  - Function: complete
  - Conditions and Messages:
    - Condition: if (bill.status !== HotelBillStatus.PAID) throw new BadRequestException('Not paid');
      Message: Not paid

- API: Service / no explicit route
  - Function: cancel
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Cannot cancel');
      Message: Cannot cancel

- API: Service / no explicit route
  - Function: findAll
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Cooperation ${dto.cooperationId} not found`);
      Message: Cooperation ${dto.cooperationId} not found

- API: Service / no explicit route
  - Function: findAll
  - Conditions and Messages:
    - Condition: throw new BadRequestException('checkOutDate must be after checkInDate');
      Message: checkOutDate must be after checkInDate

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Hotel room ${id} not found`);
      Message: Hotel room ${id} not found

- API: Service / no explicit route
  - Function: update
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: remove
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: getAvailableRoomCount
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Hotel room ${roomId} not found`);
      Message: Hotel room ${roomId} not found

- API: Service / no explicit route
  - Function: ensureRoomAvailability
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: reserveRooms
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Hotel room ${context.room.id} not found`);
      Message: Hotel room ${context.room.id} not found

- API: Service / no explicit route
  - Function: releaseRooms
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Hotel room ${context.room.id} not found`);
      Message: Hotel room ${context.room.id} not found

- API: Service / no explicit route
  - Function: incrementRoomMetrics
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Hotel room ${roomId} not found`);
      Message: Hotel room ${roomId} not found

## Module: notification

- API: Service / no explicit route
  - Function: sendEmail
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: sendPushNotification
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: createNotification
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found

- API: Service / no explicit route
  - Function: findMyNotifications
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: markAsRead
  - Conditions and Messages:
    - Condition: throw new NotFoundException('Notification not found');
      Message: Notification not found

- API: Service / no explicit route
  - Function: findAllNotifications
  - Conditions and Messages:
    - None found (No explicit message)

## Module: payment

- API: Service / no explicit route
  - Function: createMomoPayment
  - Conditions and Messages:
    - Condition: throw new BadRequestException(`Không tìm thấy rental ${rentalId}`);
      Message: Không tìm thấy rental ${rentalId}
    - Condition: throw new BadRequestException('Thiếu cấu hình MoMo (partnerCode/accessKey/secretKey/endpoint/ipnUrl)');
      Message: 'Thiếu cấu hình MoMo (partnerCode/accessKey/secretKey/endpoint/ipnUrl
    - Condition: throw new BadRequestException('Tạo yêu cầu thanh toán MoMo thất bại');
      Message: Tạo yêu cầu thanh toán MoMo thất bại

- API: Service / no explicit route
  - Function: createQrPayment
  - Conditions and Messages:
    - Condition: throw new BadRequestException(`Không tìm thấy rental ${rentalId}`);
      Message: Không tìm thấy rental ${rentalId}

- API: Service / no explicit route
  - Function: confirmQrPayment
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Không tìm thấy payment QR');
      Message: Không tìm thấy payment QR
    - Condition: throw new BadRequestException('Số tiền không khớp');
      Message: Số tiền không khớp

- API: Service / no explicit route
  - Function: handleMomoIpn
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Thiếu cấu hình MoMo');
      Message: Thiếu cấu hình MoMo
    - Condition: throw new BadRequestException('Thiếu orderId/requestId/signature');
      Message: Thiếu orderId/requestId/signature
    - Condition: throw new BadRequestException('Sai chữ ký MoMo');
      Message: Sai chữ ký MoMo
    - Condition: throw new BadRequestException('Không tìm thấy payment');
      Message: Không tìm thấy payment

- API: Service / no explicit route
  - Function: refundMomo
  - Conditions and Messages:
    - Condition: if (!payment) throw new BadRequestException('Không tìm thấy payment');
      Message: Không tìm thấy payment
    - Condition: throw new BadRequestException('Payment không phải MoMo');
      Message: Payment không phải MoMo
    - Condition: throw new BadRequestException('Thiếu transactionId/orderId/requestId để refund');
      Message: Thiếu transactionId/orderId/requestId để refund
    - Condition: throw new BadRequestException('Thiếu cấu hình MoMo refund');
      Message: Thiếu cấu hình MoMo refund
    - Condition: throw new BadRequestException('Refund MoMo thất bại');
      Message: Refund MoMo thất bại

- API: Service / no explicit route
  - Function: refundLatestByRental
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: createPayoutPending
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Thiếu thông tin ngân hàng của chủ xe');
      Message: Thiếu thông tin ngân hàng của chủ xe

- API: Service / no explicit route
  - Function: listPayoutsByOwner
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: updatePayoutStatus
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Không tìm thấy payout');
      Message: Không tìm thấy payout

## Module: province

- API: POST /provinces/upload/avatar
  - Function: uploadAvatar
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findAll
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Province with code ${code} not found`);
      Message: Province with code ${code} not found

- API: Service / no explicit route
  - Function: update
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: bulkUpdate
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: remove
  - Conditions and Messages:
    - None found (No explicit message)

## Module: rental-bill

- API: Service / no explicit route
  - Function: checkTimeouts
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Rental bill ${id} not found`);
      Message: Rental bill ${id} not found
    - Condition: throw new ForbiddenException('You do not have access to this rental bill');
      Message: You do not have access to this rental bill

- API: Service / no explicit route
  - Function: update
  - Conditions and Messages:
    - Condition: throw new BadRequestException(`Cannot update bill in ${bill.status} status`);
      Message: Cannot update bill in ${bill.status} status
    - Condition: if (!voucher) throw new NotFoundException('Voucher not found');
      Message: Voucher not found
    - Condition: throw new BadRequestException('travelPointsUsed must be a non-negative number');
      Message: travelPointsUsed must be a non-negative number
    - Condition: throw new BadRequestException(`Bạn không đủ điểm (Hiện có: ${bill.user.travelPoint})`);
      Message: `Bạn không đủ điểm (Hiện có: ${bill.user.travelPoint}

- API: Service / no explicit route
  - Function: pay
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Only PENDING bills can be paid');
      Message: Only PENDING bills can be paid
    - Condition: throw new BadRequestException('paymentMethod is required (Confirm before paying)');
      Message: 'paymentMethod is required (Confirm before paying
    - Condition: throw new BadRequestException('Total amount must be greater than 0');
      Message: Total amount must be greater than 0
    - Condition: throw new BadRequestException('Unsupported payment method');
      Message: Unsupported payment method

- API: Service / no explicit route
  - Function: complete
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Only PAID bills can be completed');
      Message: Only PAID bills can be completed

- API: Service / no explicit route
  - Function: cancel
  - Conditions and Messages:
    - Condition: throw new BadRequestException(`Bill is already ${bill.status}`);
      Message: Bill is already ${bill.status}

- API: Service / no explicit route
  - Function: ownerDelivering
  - Conditions and Messages:
    - Condition: if (!bill) throw new NotFoundException('Bill not found');
      Message: Bill not found
    - Condition: throw new ForbiddenException('You do not have access to this bill');
      Message: You do not have access to this bill
    - Condition: throw new BadRequestException('Chỉ có thể giao xe sau khi khách đã thanh toán');
      Message: Chỉ có thể giao xe sau khi khách đã thanh toán
    - Condition: throw new BadRequestException(`Chỉ được phép bấm giao xe từ lúc ${oneHourBeforeStart.toLocaleString('vi-VN')} (tối đa 1 tiếng trước giờ thuê)`);
      Message: Chỉ được phép bấm giao xe từ lúc ${oneHourBeforeStart.toLocaleString(
    - Condition: throw new BadRequestException('Đơn hàng chưa ở trạng thái ĐÃ ĐẶT (BOOKED)');
      Message: 'Đơn hàng chưa ở trạng thái ĐÃ ĐẶT (BOOKED

- API: Service / no explicit route
  - Function: ownerDelivered
  - Conditions and Messages:
    - Condition: if (!bill) throw new NotFoundException('Bill not found');
      Message: Bill not found
    - Condition: throw new BadRequestException('Phải bấm đang vận chuyển trước khi xác nhận đã đến');
      Message: Phải bấm đang vận chuyển trước khi xác nhận đã đến
    - Condition: throw new BadRequestException(`Chỉ được phép xác nhận đã giao đến từ lúc ${thirtyMinsBeforeStart.toLocaleString('vi-VN')} (tối đa 30 phút trước giờ thuê)`);
      Message: Chỉ được phép xác nhận đã giao đến từ lúc ${thirtyMinsBeforeStart.toLocaleString(

- API: Service / no explicit route
  - Function: userPickup
  - Conditions and Messages:
    - Condition: if (!bill) throw new NotFoundException('Bill not found');
      Message: Bill not found
    - Condition: throw new BadRequestException('Chủ xe chưa giao xe đến nơi');
      Message: Chủ xe chưa giao xe đến nơi

- API: Service / no explicit route
  - Function: userReturnRequest
  - Conditions and Messages:
    - Condition: if (!bill) throw new NotFoundException('Bill not found');
      Message: Bill not found
    - Condition: throw new BadRequestException('Chỉ được phép yêu cầu trả xe khi đang trong quá trình hành trình (IN_PROGRESS)');
      Message: 'Chỉ được phép yêu cầu trả xe khi đang trong quá trình hành trình (IN_PROGRESS
    - Condition: throw new BadRequestException(`Chỉ được phép yêu cầu trả xe từ lúc ${thirtyMinsBeforeEnd.toLocaleString('vi-VN')} (tối đa 30 phút trước giờ kết thúc)`);
      Message: Chỉ được phép yêu cầu trả xe từ lúc ${thirtyMinsBeforeEnd.toLocaleString(

- API: Service / no explicit route
  - Function: ownerConfirmReturn
  - Conditions and Messages:
    - Condition: if (!bill) throw new NotFoundException('Bill not found');
      Message: Bill not found
    - Condition: throw new BadRequestException('Khách hàng chưa gửi yêu cầu trả xe');
      Message: Khách hàng chưa gửi yêu cầu trả xe
    - Condition: throw new BadRequestException(`Vị trí xác nhận của bạn quá xa vị trí khách trả xe (${Math.round(distance * 1000)}m > 50m)`);
      Message: `Vị trí xác nhận của bạn quá xa vị trí khách trả xe (${Math.round(distance * 1000

- API: Service / no explicit route
  - Function: addVehicleToBill
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Can only add vehicles to PENDING bills');
      Message: Can only add vehicles to PENDING bills
    - Condition: if (!vehicle) throw new NotFoundException('Vehicle not found');
      Message: Vehicle not found
    - Condition: throw new BadRequestException('Vehicle is not available for rental');
      Message: Vehicle is not available for rental
    - Condition: throw new BadRequestException('All vehicles must belong to the same owner');
      Message: All vehicles must belong to the same owner
    - Condition: throw new BadRequestException(`Vehicle does not have a price for package ${pkg}`);
      Message: Vehicle does not have a price for package ${pkg}

- API: Service / no explicit route
  - Function: removeVehicleFromBill
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Can only remove vehicles from PENDING bills');
      Message: Can only remove vehicles from PENDING bills

- API: Service / no explicit route
  - Function: ownerCancel
  - Conditions and Messages:
    - Condition: if (!bill) throw new NotFoundException(`Rental bill ${id} not found`);
      Message: Rental bill ${id} not found
    - Condition: throw new ForbiddenException('You are not the owner of this bill');
      Message: You are not the owner of this bill
    - Condition: throw new BadRequestException('Can only cancel paid bills');
      Message: Can only cancel paid bills
    - Condition: throw new BadRequestException('Cannot cancel after the delivery date');
      Message: Cannot cancel after the delivery date

- API: Service / no explicit route
  - Function: generatePaymentQR
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findAll
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findBillsByOwner
  - Conditions and Messages:
    - None found (No explicit message)

## Module: rental-contract

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found

- API: Service / no explicit route
  - Function: findMyContracts
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findAllForAdmin
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: throw new ForbiddenException('You do not have access to this contract');
      Message: You do not have access to this contract

- API: Service / no explicit route
  - Function: update
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: approve
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: reject
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: suspend
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: remove
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: incrementVehicleCounter
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: adjustRentalMetrics
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Rejected contracts require a reason');
      Message: Rejected contracts require a reason

## Module: rental-vehicle

- API: POST /rental-vehicles/:licensePlate/favorite
  - Function: favorite
  - Conditions and Messages:
    - None found (No explicit message)

- API: DELETE /rental-vehicles/:licensePlate/favorite
  - Function: unfavorite
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Contract ${dto.contractId} not found`);
      Message: Contract ${dto.contractId} not found
    - Condition: throw new ForbiddenException('You do not have access to this contract');
      Message: You do not have access to this contract

- API: Service / no explicit route
  - Function: findMyVehicles
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findAll
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: search
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Vehicle ${licensePlate} not found`);
      Message: Vehicle ${licensePlate} not found

- API: Service / no explicit route
  - Function: update
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: remove
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: approve
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: reject
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Rejected vehicles require a reason');
      Message: Rejected vehicles require a reason

- API: Service / no explicit route
  - Function: disable
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: enable
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: addMaintenance
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Phương tiện đã có lịch bảo trì trùng với thời gian này');
      Message: Phương tiện đã có lịch bảo trì trùng với thời gian này
    - Condition: throw new BadRequestException('Phương tiện đã có lịch khách đặt trong thời gian này');
      Message: Phương tiện đã có lịch khách đặt trong thời gian này

- API: Service / no explicit route
  - Function: findFavoritesByUser
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found

- API: Service / no explicit route
  - Function: favorite
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found
    - Condition: throw new NotFoundException(`Vehicle ${licensePlate} not found`);
      Message: Vehicle ${licensePlate} not found

- API: Service / no explicit route
  - Function: unfavorite
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found

## Module: restaurant

- API: Service / no explicit route
  - Function: checkTimeouts
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - Condition: if (!user) throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found
    - Condition: if (!table) throw new NotFoundException('Restaurant table not found');
      Message: Restaurant table not found
    - Condition: throw new BadRequestException('Number of guests exceeds table capacity');
      Message: Number of guests exceeds table capacity

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: if (!booking) throw new NotFoundException(`Restaurant booking ${id} not found`);
      Message: Restaurant booking ${id} not found
    - Condition: if (booking.user?.id !== userId) throw new ForbiddenException('Forbidden');
      Message: Forbidden

- API: Service / no explicit route
  - Function: update
  - Conditions and Messages:
    - Condition: throw new BadRequestException(`Cannot update booking in ${booking.status} status`);
      Message: Cannot update booking in ${booking.status} status

- API: Service / no explicit route
  - Function: confirm
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Not pending');
      Message: Not pending
    - Condition: throw new BadRequestException('Contact info required');
      Message: Contact info required

- API: Service / no explicit route
  - Function: cancel
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Finished');
      Message: Finished

- API: Service / no explicit route
  - Function: findAll
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findAll
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Restaurant table ${id} not found`);
      Message: Restaurant table ${id} not found

- API: Service / no explicit route
  - Function: update
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: remove
  - Conditions and Messages:
    - None found (No explicit message)

## Module: train

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found
    - Condition: throw new NotFoundException(`Train route ${dto.routeId} not found`);
      Message: Train route ${dto.routeId} not found
    - Condition: throw new BadRequestException('At least one passenger is required');
      Message: At least one passenger is required
    - Condition: throw new NotFoundException(`Voucher ${dto.voucherCode} not found`);
      Message: Voucher ${dto.voucherCode} not found
    - Condition: throw new BadRequestException('Not enough travel points');
      Message: Not enough travel points
    - Condition: throw new BadRequestException('Total amount cannot be negative');
      Message: Total amount cannot be negative

- API: Service / no explicit route
  - Function: findAll
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Train bill ${id} not found`);
      Message: Train bill ${id} not found

- API: Service / no explicit route
  - Function: update
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Train route ${dto.routeId} not found`);
      Message: Train route ${dto.routeId} not found
    - Condition: throw new BadRequestException('At least one passenger is required');
      Message: At least one passenger is required
    - Condition: throw new NotFoundException(`Voucher ${dto.voucherCode} not found`);
      Message: Voucher ${dto.voucherCode} not found
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found
    - Condition: throw new BadRequestException('Not enough travel points');
      Message: Not enough travel points
    - Condition: throw new BadRequestException('Total amount cannot be negative');
      Message: Total amount cannot be negative

- API: Service / no explicit route
  - Function: remove
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - Condition: throw new BadRequestException('durationMinutes must be non-negative');
      Message: durationMinutes must be non-negative

- API: Service / no explicit route
  - Function: findAll
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Train route ${id} not found`);
      Message: Train route ${id} not found

- API: Service / no explicit route
  - Function: update
  - Conditions and Messages:
    - Condition: throw new BadRequestException('durationMinutes must be non-negative');
      Message: durationMinutes must be non-negative

- API: Service / no explicit route
  - Function: remove
  - Conditions and Messages:
    - None found (No explicit message)

## Module: travel-route

- API: POST /travel-routes/:id/favorite
  - Function: favorite
  - Conditions and Messages:
    - None found (No explicit message)

- API: DELETE /travel-routes/:id/favorite
  - Function: unfavorite
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: cloneRoute
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Travel route ${routeId} not found`);
      Message: Travel route ${routeId} not found

- API: Service / no explicit route
  - Function: publicizeRoute
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Route ${routeId} not found`);
      Message: Route ${routeId} not found
    - Condition: throw new ForbiddenException('You do not own this route');
      Message: You do not own this route
    - Condition: throw new BadRequestException('Only completed routes can be publicized');
      Message: Only completed routes can be publicized
    - Condition: throw new BadRequestException('Only edited routes can be publicized');
      Message: Only edited routes can be publicized

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findAll
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findByUser
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findDrafts
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: useClone
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Public route ${routeId} not found`);
      Message: Public route ${routeId} not found
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found

- API: Service / no explicit route
  - Function: findFavoritesByUser
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found

- API: Service / no explicit route
  - Function: favorite
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found
    - Condition: throw new NotFoundException(`Travel route ${routeId} not found`);
      Message: Travel route ${routeId} not found
    - Condition: throw new BadRequestException('Chỉ có thể thêm hành trình công khai vào danh sách yêu thích');
      Message: Chỉ có thể thêm hành trình công khai vào danh sách yêu thích

- API: Service / no explicit route
  - Function: unfavorite
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found

- API: Service / no explicit route
  - Function: addStops
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Stop list cannot be empty');
      Message: Stop list cannot be empty
    - Condition: throw new NotFoundException(`Travel route ${routeId} not found`);
      Message: Travel route ${routeId} not found

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Travel route ${id} not found`);
      Message: Travel route ${id} not found

- API: Service / no explicit route
  - Function: getStopDetail
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findRouteDatesByUser
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: update
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Travel route ${id} not found`);
      Message: Travel route ${id} not found
    - Condition: throw new ForbiddenException('You do not own this route');
      Message: You do not own this route
    - Condition: throw new BadRequestException('Cannot change start/end date for a route that is not UPCOMING');
      Message: Cannot change start/end date for a route that is not UPCOMING

- API: Service / no explicit route
  - Function: remove
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Travel route ${id} not found`);
      Message: Travel route ${id} not found

- API: Service / no explicit route
  - Function: updateStopTime
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: updateStopDetails
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Cannot update details for a completed stop');
      Message: Cannot update details for a completed stop

- API: Service / no explicit route
  - Function: reorderStop
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Travel route ${routeId} not found`);
      Message: Travel route ${routeId} not found
    - Condition: throw new NotFoundException(`Stop ${stopId} not found in day list`);
      Message: Stop ${stopId} not found in day list

- API: Service / no explicit route
  - Function: removeStop
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: uploadStopMedia
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: deleteStopMedia
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: checkInStop
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Stop is not linked to a destination');
      Message: Stop is not linked to a destination
    - Condition: throw new BadRequestException('Destination is missing longitude');
      Message: Destination is missing longitude
    - Condition: throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found
    - Condition: throw new BadRequestException('startDate must be less than or equal to endDate');
      Message: startDate must be less than or equal to endDate
    - Condition: throw new BadRequestException('Time must be in HH:mm format');
      Message: Time must be in HH:mm format

- API: Service / no explicit route
  - Function: suggestQuick
  - Conditions and Messages:
    - Condition: if (!user) throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found

- API: Service / no explicit route
  - Function: suggestAdvanced
  - Conditions and Messages:
    - Condition: if (!user) throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found

- API: Service / no explicit route
  - Function: claimSuggestedRoute
  - Conditions and Messages:
    - Condition: if (!user) throw new NotFoundException(`User ${userId} not found`);
      Message: User ${userId} not found
    - Condition: throw new NotFoundException(`Travel route ${savedRoute.id} not found after creation`);
      Message: Travel route ${savedRoute.id} not found after creation
    - Condition: throw new BadRequestException(detail);
      Message: detail
    - Condition: throw new ServiceUnavailableException(detail);
      Message: detail
    - Condition: throw new ServiceUnavailableException('Không thể kết nối tới AI route service');
      Message: Không thể kết nối tới AI route service

- API: Service / no explicit route
  - Function: getAnniversaryDetail
  - Conditions and Messages:
    - Condition: if (!route) throw new NotFoundException('Route not found');
      Message: Route not found
    - Condition: if (route.user?.id !== userId) throw new ForbiddenException('Not your route');
      Message: Not your route
    - Condition: throw new BadRequestException('Chỉ có thể xem kỷ niệm cho chuyến đi đã hoàn thành');
      Message: Chỉ có thể xem kỷ niệm cho chuyến đi đã hoàn thành
    - Condition: throw new NotFoundException(`Không tìm thấy địa điểm: ${missing.join(', ')}`);
      Message: Không tìm thấy địa điểm: ${missing.join(
    - Condition: throw new BadRequestException('Start time must be before end time');
      Message: Start time must be before end time

## Module: user

- API: PATCH /users/profile/avatar
  - Function: updateAvatar
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${id} not found`);
      Message: User ${id} not found

- API: Service / no explicit route
  - Function: findByUsername
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findByEmail
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: updatePassword
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findById
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findByPhone
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: markPhoneVerified
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: markEmailVerified
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: update
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: remove
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: markCitizenIdVerified
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: verifyCitizenIdWithImages
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: updateFcmToken
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: updateInitialProfile
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: updateVerificationInfo
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: updateHobbies
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: updateAvatarUrl
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: deleteAvatarUrl
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: updateProfile
  - Conditions and Messages:
    - None found (No explicit message)

## Module: vehicle-catalog

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findAll
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Vehicle catalog ${id} not found`);
      Message: Vehicle catalog ${id} not found

- API: Service / no explicit route
  - Function: update
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: remove
  - Conditions and Messages:
    - None found (No explicit message)

## Module: vn-administrative

- API: Service / no explicit route
  - Function: findProvinceByCode
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Legacy province ${code} not found`);
      Message: Legacy province ${code} not found

- API: Service / no explicit route
  - Function: findDistrictByCode
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Legacy district ${code} not found`);
      Message: Legacy district ${code} not found

- API: Service / no explicit route
  - Function: findWardByCode
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Legacy ward ${code} not found`);
      Message: Legacy ward ${code} not found

- API: Service / no explicit route
  - Function: translate
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: translateDestination
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: enrichDestinations
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findByOldWard
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`No mapping found for legacy ward ${code}.`);
      Message: No mapping found for legacy ward ${code}.

- API: Service / no explicit route
  - Function: findByNewCommune
  - Conditions and Messages:
    - None found (No explicit message)

- API: GET /vn-admin/reform/provinces/:code
  - Function: getProvince
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findProvinceByCode
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Reform province ${code} not found`);
      Message: Reform province ${code} not found

- API: Service / no explicit route
  - Function: findCommuneByCode
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Reform commune ${code} not found`);
      Message: Reform commune ${code} not found

## Module: voucher

- API: Service / no explicit route
  - Function: create
  - Conditions and Messages:
    - Condition: throw new BadRequestException(`Voucher code ${dto.code} already exists`);
      Message: Voucher code ${dto.code} already exists

- API: Service / no explicit route
  - Function: findAll
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: findOne
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`Voucher ${id} not found`);
      Message: Voucher ${id} not found

- API: Service / no explicit route
  - Function: findByCode
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: update
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: incrementUsage
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: decrementUsage
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Voucher is inactive');
      Message: Voucher is inactive
    - Condition: throw new BadRequestException('Voucher is not active yet');
      Message: Voucher is not active yet
    - Condition: throw new BadRequestException('Voucher has expired');
      Message: Voucher has expired
    - Condition: throw new BadRequestException('Voucher usage limit reached');
      Message: Voucher usage limit reached

## Module: wallet

- API: Service / no explicit route
  - Function: createPaymentUrl
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Failed to create MoMo payment url');
      Message: Failed to create MoMo payment url

- API: GET /wallet/balance
  - Function: getBalance
  - Conditions and Messages:
    - None found (No explicit message)

- API: POST /wallet/deposit
  - Function: deposit
  - Conditions and Messages:
    - None found (No explicit message)

- API: POST /wallet/pay
  - Function: pay
  - Conditions and Messages:
    - None found (No explicit message)

- API: POST /wallet/momo-deposit
  - Function: momoDeposit
  - Conditions and Messages:
    - None found (No explicit message)

- API: POST /wallet/create-momo-payment
  - Function: createMomoPayment
  - Conditions and Messages:
    - None found (No explicit message)

- API: POST /wallet/momo-ipn
  - Function: handleMomoIpn
  - Conditions and Messages:
    - None found (No explicit message)

- API: Service / no explicit route
  - Function: createWallet
  - Conditions and Messages:
    - Condition: throw new NotFoundException(`User ${userId} không tồn tại`);
      Message: User ${userId} không tồn tại

- API: Service / no explicit route
  - Function: getBalance
  - Conditions and Messages:
    - Condition: throw new NotFoundException('Wallet not found');
      Message: Wallet not found

- API: Service / no explicit route
  - Function: deposit
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Deposit amount must be greater than zero');
      Message: Deposit amount must be greater than zero

- API: Service / no explicit route
  - Function: pay
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Payment amount must be greater than zero');
      Message: Payment amount must be greater than zero
    - Condition: throw new BadRequestException('referenceId is required for payments');
      Message: referenceId is required for payments

- API: Service / no explicit route
  - Function: refund
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Refund amount must be greater than zero');
      Message: Refund amount must be greater than zero

- API: Service / no explicit route
  - Function: reward
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Reward amount must be greater than zero');
      Message: Reward amount must be greater than zero

- API: Service / no explicit route
  - Function: simulateMomoDeposit
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Deposit amount must be greater than zero');
      Message: Deposit amount must be greater than zero

- API: Service / no explicit route
  - Function: lockFunds
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Lock amount must be greater than zero');
      Message: Lock amount must be greater than zero
    - Condition: throw new NotFoundException('Wallet not found');
      Message: Wallet not found
    - Condition: throw new BadRequestException('Insufficient wallet balance');
      Message: Insufficient wallet balance

- API: Service / no explicit route
  - Function: releaseFunds
  - Conditions and Messages:
    - Condition: throw new BadRequestException('Release amount must be greater than zero');
      Message: Release amount must be greater than zero
    - Condition: throw new NotFoundException('Renter wallet not found');
      Message: Renter wallet not found
    - Condition: throw new BadRequestException('Insufficient locked balance');
      Message: Insufficient locked balance
    - Condition: throw new NotFoundException('Owner wallet not found');
      Message: Owner wallet not found
    - Condition: throw new NotFoundException('Wallet not found');
      Message: Wallet not found
    - Condition: throw new BadRequestException('Insufficient wallet balance');
      Message: Insufficient wallet balance

