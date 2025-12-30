import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoinRoom(
    @MessageBody() data: { userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `user_${data.userId}`;
    client.join(roomName);
    this.logger.log(`Client ${client.id} joined room ${roomName}`);
    return { event: 'joined', data: roomName };
  }

  sendToUser(userId: number, event: string, payload: any) {
    const roomName = `user_${userId}`;
    this.server.to(roomName).emit(event, payload);
    this.logger.log(`Emitted ${event} to ${roomName}`);
  }
}
