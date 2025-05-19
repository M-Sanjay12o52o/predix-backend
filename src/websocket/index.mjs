import { WebSocketServer } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // userId -> WebSocket
    this.marketSubscriptions = new Map(); // marketId -> Set of userIds
    this.userSubscriptions = new Map(); // userId -> Set of marketIds
  }

  initialize(server) {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', async (ws, req) => {
      try {
        // Extract token from query string
        const token = new URL(req.url, 'ws://localhost').searchParams.get('token');
        if (!token) {
          ws.close(1008, 'Authentication required');
          return;
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        // Store client connection
        this.clients.set(userId, ws);
        this.userSubscriptions.set(userId, new Set());

        // Handle messages
        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message);
            this.handleMessage(userId, data);
          } catch (error) {
            console.error('Error handling message:', error);
          }
        });

        // Handle disconnection
        ws.on('close', () => {
          this.handleDisconnect(userId);
        });

        // Send initial connection success
        ws.send(JSON.stringify({
          type: 'CONNECTION_ESTABLISHED',
          userId
        }));

      } catch (error) {
        console.error('WebSocket connection error:', error);
        ws.close(1008, 'Authentication failed');
      }
    });
  }

  handleMessage(userId, data) {
    switch (data.type) {
      case 'SUBSCRIBE_MARKET':
        this.subscribeToMarket(userId, data.marketId);
        break;
      case 'UNSUBSCRIBE_MARKET':
        this.unsubscribeFromMarket(userId, data.marketId);
        break;
      default:
        console.warn('Unknown message type:', data.type);
    }
  }

  handleDisconnect(userId) {
    // Remove all subscriptions for this user
    const userMarkets = this.userSubscriptions.get(userId) || new Set();
    userMarkets.forEach(marketId => {
      this.unsubscribeFromMarket(userId, marketId);
    });

    // Clean up user data
    this.clients.delete(userId);
    this.userSubscriptions.delete(userId);
  }

  subscribeToMarket(userId, marketId) {
    // Add market to user's subscriptions
    if (!this.userSubscriptions.has(userId)) {
      this.userSubscriptions.set(userId, new Set());
    }
    this.userSubscriptions.get(userId).add(marketId);

    // Add user to market's subscribers
    if (!this.marketSubscriptions.has(marketId)) {
      this.marketSubscriptions.set(marketId, new Set());
    }
    this.marketSubscriptions.get(marketId).add(userId);
  }

  unsubscribeFromMarket(userId, marketId) {
    // Remove market from user's subscriptions
    const userMarkets = this.userSubscriptions.get(userId);
    if (userMarkets) {
      userMarkets.delete(marketId);
    }

    // Remove user from market's subscribers
    const marketSubscribers = this.marketSubscriptions.get(marketId);
    if (marketSubscribers) {
      marketSubscribers.delete(userId);
    }
  }

  // Broadcast methods
  broadcastMarketUpdate(marketId, data) {
    const subscribers = this.marketSubscriptions.get(marketId) || new Set();
    subscribers.forEach(userId => {
      const client = this.clients.get(userId);
      if (client && client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify({
          type: 'MARKET_UPDATE',
          marketId,
          data
        }));
      }
    });
  }

  broadcastTradeUpdate(userId, data) {
    const client = this.clients.get(userId);
    if (client && client.readyState === 1) {
      client.send(JSON.stringify({
        type: 'TRADE_UPDATE',
        data
      }));
    }
  }

  broadcastPortfolioUpdate(userId, data) {
    const client = this.clients.get(userId);
    if (client && client.readyState === 1) {
      client.send(JSON.stringify({
        type: 'PORTFOLIO_UPDATE',
        data
      }));
    }
  }
}

export const wsManager = new WebSocketManager(); 