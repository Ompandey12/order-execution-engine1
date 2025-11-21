import { broadcastToOrderSockets, orderSocketMap } from '../src/services/websocketService';

describe('WebSocket service', () => {
  afterEach(() => {
    // Clean up socket map after each test
    orderSocketMap.clear();
  });

  it('broadcasts message to subscribed sockets', () => {
    const orderId = 'order-abc';
    const messages: string[] = [];

    // Create mock WebSocket
    const mockSocket = {
      send: jest.fn((msg: string) => messages.push(msg))
    };

    // Register socket for orderId
    const socketSet = new Set();
    socketSet.add(mockSocket);
    orderSocketMap.set(orderId, socketSet);

    // Broadcast message
    const payload = { orderId, status: 'pending', data: { test: true } };
    broadcastToOrderSockets(orderId, payload);

    // Verify socket received the message
    expect(mockSocket.send).toHaveBeenCalledTimes(1);
    expect(mockSocket.send).toHaveBeenCalledWith(JSON.stringify(payload));
  });

  it('handles multiple sockets for same order', () => {
    const orderId = 'order-xyz';

    const mockSocket1 = { send: jest.fn() };
    const mockSocket2 = { send: jest.fn() };

    const socketSet = new Set([mockSocket1, mockSocket2]);
    orderSocketMap.set(orderId, socketSet);

    const payload = { orderId, status: 'confirmed' };
    broadcastToOrderSockets(orderId, payload);

    expect(mockSocket1.send).toHaveBeenCalledTimes(1);
    expect(mockSocket2.send).toHaveBeenCalledTimes(1);
  });

  it('does nothing when no sockets subscribed', () => {
    // Should not throw error
    expect(() => {
      broadcastToOrderSockets('non-existent-order', { status: 'test' });
    }).not.toThrow();
  });
});
