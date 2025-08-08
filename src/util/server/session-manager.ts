import { RollupManager, RollupInstance, RollupProvisioningRequest } from './rollup-manager';

export interface GameSession {
  id: string;
  gameId: string;
  rollupId?: string;
  players: Set<string>;
  maxPlayers: number;
  status: 'waiting' | 'active' | 'paused' | 'ended';
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  lastActivity: Date;
  gameType: string;
  metadata: Record<string, unknown>;
}

export interface PlayerSession {
  userId: string;
  gameSessionId: string;
  joinedAt: Date;
  lastActivity: Date;
  isActive: boolean;
  metadata: Record<string, unknown>;
}

export interface SessionMapping {
  gameId: string;
  sessionId: string;
  rollupId?: string;
  playerCount: number;
  timestamp: Date;
}

export class SessionManager {
  private rollupManager: RollupManager;
  private gameSessions: Map<string, GameSession> = new Map();
  private playerSessions: Map<string, PlayerSession[]> = new Map();
  private sessionMappings: Map<string, SessionMapping> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private static instance: SessionManager;

  private constructor(rollupManager: RollupManager) {
    this.rollupManager = rollupManager;
    this.startCleanupProcess();
  }

  public static getInstance(rollupManager: RollupManager): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager(rollupManager);
    }
    return SessionManager.instance;
  }

  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 60000); // Run every minute
  }

  public async createGameSession(
    gameId: string,
    maxPlayers: number,
    gameType: string = 'default',
    autoProvisionRollup: boolean = true,
    metadata: Record<string, unknown> = {},
  ): Promise<GameSession | null> {
    try {
      const sessionId = this.generateSessionId(gameId);

      const gameSession: GameSession = {
        id: sessionId,
        gameId,
        players: new Set(),
        maxPlayers,
        status: 'waiting',
        createdAt: new Date(),
        lastActivity: new Date(),
        gameType,
        metadata,
      };

      // Provision rollup if requested and needed
      if (autoProvisionRollup && this.shouldProvisionRollup(gameType, maxPlayers)) {
        const rollup = await this.provisionRollupForSession(gameSession);
        if (rollup) {
          gameSession.rollupId = rollup.id;
        }
      }

      // Store session
      this.gameSessions.set(sessionId, gameSession);

      // Create session mapping
      this.sessionMappings.set(gameId, {
        gameId,
        sessionId,
        rollupId: gameSession.rollupId,
        playerCount: 0,
        timestamp: new Date(),
      });

      console.log(`[SessionManager] Created game session ${sessionId} for game ${gameId}`);
      return gameSession;
    } catch (error) {
      console.error(`[SessionManager] Failed to create game session for game ${gameId}:`, error);
      return null;
    }
  }

  private generateSessionId(gameId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `session-${gameId}-${timestamp}-${random}`;
  }

  private shouldProvisionRollup(gameType: string, maxPlayers: number): boolean {
    // Provision rollups for games that require low latency or have many players
    const highPerformanceGameTypes = ['pvp', 'racing', 'shooter', 'realtime'];
    const isHighPerformanceGame = highPerformanceGameTypes.includes(gameType.toLowerCase());
    const isLargeGame = maxPlayers >= 4;

    return isHighPerformanceGame || isLargeGame;
  }

  private async provisionRollupForSession(session: GameSession): Promise<RollupInstance | null> {
    const provisioningRequest: RollupProvisioningRequest = {
      gameId: session.gameId,
      maxPlayers: session.maxPlayers,
      gameType: session.gameType,
      priority: this.getGamePriority(session.gameType),
      metadata: {
        sessionId: session.id,
        createdAt: session.createdAt.toISOString(),
        ...session.metadata,
      },
    };

    return await this.rollupManager.provisionRollup(provisioningRequest);
  }

  private getGamePriority(gameType: string): 'low' | 'medium' | 'high' {
    const highPriorityTypes = ['pvp', 'tournament', 'ranked'];
    const mediumPriorityTypes = ['racing', 'shooter', 'realtime'];

    if (highPriorityTypes.includes(gameType.toLowerCase())) {
      return 'high';
    } else if (mediumPriorityTypes.includes(gameType.toLowerCase())) {
      return 'medium';
    }
    return 'low';
  }

  public async addPlayerToSession(
    gameId: string,
    userId: string,
    metadata: Record<string, unknown> = {},
  ): Promise<boolean> {
    try {
      const sessionMapping = this.sessionMappings.get(gameId);
      if (!sessionMapping) {
        console.error(`[SessionManager] No session found for game ${gameId}`);
        return false;
      }

      const gameSession = this.gameSessions.get(sessionMapping.sessionId);
      if (!gameSession) {
        console.error(`[SessionManager] Session ${sessionMapping.sessionId} not found`);
        return false;
      }

      // Check if session is full
      if (gameSession.players.size >= gameSession.maxPlayers) {
        console.warn(`[SessionManager] Session ${gameSession.id} is full`);
        return false;
      }

      // Check if player is already in session
      if (gameSession.players.has(userId)) {
        console.warn(`[SessionManager] Player ${userId} already in session ${gameSession.id}`);
        return true;
      }

      // Add player to session
      gameSession.players.add(userId);
      gameSession.lastActivity = new Date();

      // Start session if this is the first player
      if (gameSession.players.size === 1 && gameSession.status === 'waiting') {
        gameSession.status = 'active';
        gameSession.startedAt = new Date();
      }

      // Create player session record
      const playerSession: PlayerSession = {
        userId,
        gameSessionId: gameSession.id,
        joinedAt: new Date(),
        lastActivity: new Date(),
        isActive: true,
        metadata,
      };

      // Store player session
      const userSessions = this.playerSessions.get(userId) || [];
      userSessions.push(playerSession);
      this.playerSessions.set(userId, userSessions);

      // Update session mapping
      sessionMapping.playerCount = gameSession.players.size;
      sessionMapping.timestamp = new Date();

      // Update rollup player count if rollup exists
      if (gameSession.rollupId) {
        this.rollupManager.updatePlayerCount(gameId, gameSession.players.size);
      }

      console.log(`[SessionManager] Player ${userId} joined session ${gameSession.id} for game ${gameId}`);
      return true;
    } catch (error) {
      console.error(`[SessionManager] Failed to add player ${userId} to game ${gameId}:`, error);
      return false;
    }
  }

  public async removePlayerFromSession(gameId: string, userId: string): Promise<boolean> {
    try {
      const sessionMapping = this.sessionMappings.get(gameId);
      if (!sessionMapping) {
        return false;
      }

      const gameSession = this.gameSessions.get(sessionMapping.sessionId);
      if (!gameSession) {
        return false;
      }

      // Remove player from session
      const wasInSession = gameSession.players.delete(userId);
      if (!wasInSession) {
        return false;
      }

      gameSession.lastActivity = new Date();

      // Update player session record
      const userSessions = this.playerSessions.get(userId) || [];
      const playerSession = userSessions.find(ps => ps.gameSessionId === gameSession.id);
      if (playerSession) {
        playerSession.isActive = false;
        playerSession.lastActivity = new Date();
      }

      // Update session mapping
      sessionMapping.playerCount = gameSession.players.size;
      sessionMapping.timestamp = new Date();

      // Update rollup player count if rollup exists
      if (gameSession.rollupId) {
        this.rollupManager.updatePlayerCount(gameId, gameSession.players.size);
      }

      // End session if no players left
      if (gameSession.players.size === 0 && gameSession.status === 'active') {
        gameSession.status = 'ended';
        gameSession.endedAt = new Date();
      }

      console.log(`[SessionManager] Player ${userId} left session ${gameSession.id} for game ${gameId}`);
      return true;
    } catch (error) {
      console.error(`[SessionManager] Failed to remove player ${userId} from game ${gameId}:`, error);
      return false;
    }
  }

  public getGameSession(gameId: string): GameSession | null {
    const sessionMapping = this.sessionMappings.get(gameId);
    if (!sessionMapping) {
      return null;
    }

    return this.gameSessions.get(sessionMapping.sessionId) || null;
  }

  public getSessionById(sessionId: string): GameSession | null {
    return this.gameSessions.get(sessionId) || null;
  }

  public getPlayerSessions(userId: string): PlayerSession[] {
    return this.playerSessions.get(userId) || [];
  }

  public getActivePlayerSessions(userId: string): PlayerSession[] {
    const sessions = this.playerSessions.get(userId) || [];
    return sessions.filter(session => session.isActive);
  }

  public getRollupForGame(gameId: string): RollupInstance | null {
    const sessionMapping = this.sessionMappings.get(gameId);
    if (!sessionMapping?.rollupId) {
      return null;
    }

    return this.rollupManager.getRollupByGameId(gameId);
  }

  public async endGameSession(gameId: string): Promise<boolean> {
    try {
      const sessionMapping = this.sessionMappings.get(gameId);
      if (!sessionMapping) {
        return false;
      }

      const gameSession = this.gameSessions.get(sessionMapping.sessionId);
      if (!gameSession) {
        return false;
      }

      // Mark session as ended
      gameSession.status = 'ended';
      gameSession.endedAt = new Date();

      // Deactivate all player sessions
      for (const playerId of gameSession.players) {
        const userSessions = this.playerSessions.get(playerId) || [];
        const playerSession = userSessions.find(ps => ps.gameSessionId === gameSession.id);
        if (playerSession) {
          playerSession.isActive = false;
          playerSession.lastActivity = new Date();
        }
      }

      // Terminate rollup if it exists
      if (gameSession.rollupId) {
        await this.rollupManager.terminateRollup(gameId);
      }

      console.log(`[SessionManager] Ended game session ${gameSession.id} for game ${gameId}`);
      return true;
    } catch (error) {
      console.error(`[SessionManager] Failed to end game session for game ${gameId}:`, error);
      return false;
    }
  }

  public getAllSessions(): GameSession[] {
    return Array.from(this.gameSessions.values());
  }

  public getActiveSessions(): GameSession[] {
    return Array.from(this.gameSessions.values())
      .filter(session => session.status === 'active');
  }

  public getSessionStatistics(): {
    totalSessions: number;
    activeSessions: number;
    waitingSessions: number;
    endedSessions: number;
    totalPlayers: number;
    averagePlayersPerSession: number;
    sessionsWithRollups: number;
  } {
    const sessions = Array.from(this.gameSessions.values());
    
    const byStatus = {
      active: sessions.filter(s => s.status === 'active').length,
      waiting: sessions.filter(s => s.status === 'waiting').length,
      ended: sessions.filter(s => s.status === 'ended').length,
    };

    const totalPlayers = sessions.reduce((sum, session) => sum + session.players.size, 0);
    const averagePlayersPerSession = sessions.length > 0 ? totalPlayers / sessions.length : 0;
    const sessionsWithRollups = sessions.filter(s => s.rollupId).length;

    return {
      totalSessions: sessions.length,
      activeSessions: byStatus.active,
      waitingSessions: byStatus.waiting,
      endedSessions: byStatus.ended,
      totalPlayers,
      averagePlayersPerSession,
      sessionsWithRollups,
    };
  }

  private async performCleanup(): Promise<void> {
    try {
      const now = new Date();
      const sessionTimeout = 3600000; // 1 hour
      const playerSessionTimeout = 86400000; // 24 hours

      // Clean up old ended sessions
      for (const [sessionId, session] of this.gameSessions.entries()) {
        if (session.status === 'ended' && session.endedAt) {
          const timeSinceEnd = now.getTime() - session.endedAt.getTime();
          if (timeSinceEnd > sessionTimeout) {
            this.gameSessions.delete(sessionId);
            this.sessionMappings.delete(session.gameId);
            console.log(`[SessionManager] Cleaned up old session ${sessionId}`);
          }
        }
      }

      // Clean up old player sessions
      for (const [userId, sessions] of this.playerSessions.entries()) {
        const activeSessions = sessions.filter(session => {
          if (!session.isActive) {
            const timeSinceActivity = now.getTime() - session.lastActivity.getTime();
            return timeSinceActivity <= playerSessionTimeout;
          }
          return true;
        });

        if (activeSessions.length !== sessions.length) {
          this.playerSessions.set(userId, activeSessions);
        }

        if (activeSessions.length === 0) {
          this.playerSessions.delete(userId);
        }
      }
    } catch (error) {
      console.error('[SessionManager] Cleanup error:', error);
    }
  }

  public shutdown(): void {
    console.log('[SessionManager] Shutting down...');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // End all active sessions
    const activeSessions = this.getActiveSessions();
    Promise.all(
      activeSessions.map(session => this.endGameSession(session.gameId))
    ).then(() => {
      console.log('[SessionManager] All sessions ended');
    }).catch(error => {
      console.error('[SessionManager] Error during shutdown:', error);
    });
  }
}