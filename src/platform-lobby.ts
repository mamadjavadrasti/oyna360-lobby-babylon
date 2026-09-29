import { MeshBuilder, SceneLoader, Vector3 as BVector3 } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import type { SdkInitPayload, SdkLobbyAvatar } from '@oyna360/lobby-sdk';
import {
  sanitizeLobbyChat,
  sanitizeLobbyDataChannel,
  sanitizeLobbyDataPayload,
  type LobbyEmoteKind,
  type LobbyPlayerState,
  type LobbyFeatureFlags,
} from '@oyna360/lobby-sdk';
import { AvatarFactory } from './avatar-factory';
import { AvatarAssetManager, type AvatarBaseDef } from './avatar-asset-manager';
import { ensureDracoDecoder } from './draco';
import { LocalPlayerController } from './local-player-controller';
import { LobbyClient } from '@oyna360/lobby-sdk';
import { PlatformBridge } from '@oyna360/lobby-sdk';
import { LobbyAvatarController } from '@oyna360/lobby-sdk';
import { readBaseAlbedoUrlFromConfig, readTintFromConfig } from './avatar-factory';
import { attachAccessoriesFromAvatarConfig } from './avatar-accessories';
import { RemotePlayerManager } from './remote-player-manager';
import { SceneManager } from './scene-manager';
import type { LobbyPlugin } from '@oyna360/lobby-sdk';
import { PortalManager, ZoneManager } from '@oyna360/lobby-sdk';
import { applyStarterLayout as applyStarterLayoutFn, type StarterLayoutConfig } from './starter-layout';
import { applyPlazaLayout as applyPlazaLayoutFn, type PlazaLayoutConfig } from './plaza-layout';
import { applyLobbyCollisions } from './lobby-colliders';
import { attachLobbyDebug, buildLobbyDebugReport } from './lobby-debug';
import { attachLobbyPerfDiag, lobbyPerfNoteLocalUpdate, isLobbyPerfDiagEnabled } from './lobby-perf-diag';
import { attachRealDeviceAvatarDiag } from './lobby-real-device-diag';
import { attachPlazaDiag } from './lobby-plaza-diag';
import { attachPlayground, type PlaygroundSystem } from './playground/playground-system';
import { LobbyMusic } from '@oyna360/lobby-sdk';
import { attachLobbyChatUi } from './ui/lobby-chat-ui';
import { attachLobbyPresenceUi } from './ui/lobby-presence-ui';
import { attachLobbyVoiceUi } from './ui/lobby-voice-ui';
import { attachLobbyConnectionUi } from './ui/lobby-connection-ui';
import { attachLobbyOrientationUi } from './ui/lobby-orientation-ui';
import { ensureLobbyPersianFont } from '@oyna360/lobby-sdk';
import { provisionalSpawnSlot, resolveSpawnPose } from '@oyna360/lobby-sdk';
import { LobbyVoiceChat } from '@oyna360/lobby-sdk';
import type {
  LobbyEventMap,
  LobbyEventName,
  LobbyPortalOptions,
  LobbyZoneOptions,
  PlatformLobbyConfig,
  PlatformLobbyCreateOptions,
  PlatformLobbyDevOptions,
  Vector3,
} from '@oyna360/lobby-sdk';

const DEFAULT_LOBBY_FEATURES: LobbyFeatureFlags = {
  chatEnabled: true,
  voiceEnabled: true,
  chatAllowed: true,
  voiceAllowed: true,
};

export class PlatformLobby {
  private readonly init: SdkInitPayload;
  private readonly config: PlatformLobbyConfig;
  private readonly roomId: string;
  private readonly wsUrl: string;
  /** Local avatar customization (Core state). Games use lobby.avatar.*. */
  readonly avatar: LobbyAvatarController;
  private sceneManager!: SceneManager;
  private localAvatar!: ReturnType<typeof AvatarFactory.create>;
  private localController!: LocalPlayerController;
  private remotePlayers!: RemotePlayerManager;
  /** Core session — source of truth for room/player network state. */
  private lobbyClient: LobbyClient | null = null;
  private zoneManager = new ZoneManager();
  private portalManager = new PortalManager();
  private plugins: LobbyPlugin[] = [];
  private overlayHandlers = new Map<string, (payload: unknown) => void>();
  private listeners = new Map<LobbyEventName, Set<(payload: unknown) => void>>();
  private lastNetworkSend = 0;
  private destroyed = false;
  private ready = false;
  private playground: PlaygroundSystem | null = null;
  private music = new LobbyMusic();
  private chatDispose: (() => void) | null = null;
  private presenceDispose: (() => void) | null = null;
  private voiceDispose: (() => void) | null = null;
  private connectionDispose: (() => void) | null = null;
  private orientationDispose: (() => void) | null = null;
  private voiceChat: LobbyVoiceChat | null = null;
  private lobbyFeatures: LobbyFeatureFlags = { ...DEFAULT_LOBBY_FEATURES };
  private resizeHandler = () => this.sceneManager?.resize();
  private unsubAvatarChange: (() => void) | null = null;
  private applyingAvatarState = false;

  private constructor(
    init: SdkInitPayload,
    private readonly canvas: HTMLCanvasElement,
    roomId: string,
    wsUrl: string,
    config: PlatformLobbyConfig = {},
    private readonly strictRoom = false,
  ) {
    this.init = init;
    this.roomId = roomId;
    this.wsUrl = wsUrl;
    this.config = {
      enableMultiplayer: true,
      ...config,
    };
    this.avatar = LobbyAvatarController.fromSdk(init.avatar);
    this.unsubAvatarChange = this.avatar.on('change', () => {
      void this.applyLocalAvatarState();
    });
  }

  static async create(options: PlatformLobbyCreateOptions): Promise<PlatformLobby> {
    const init = PlatformBridge.fromInit(options.platformInit);
    const roomId = options.roomId ?? init.lobby?.roomId ?? `game:${init.game.slug}`;
    const wsUrl = options.wsUrl ?? init.lobby?.wsUrl ?? 'http://localhost:3001/lobby';
    const strictRoom = options.strictRoom ?? init.lobby?.strictRoom ?? false;
    const lobby = new PlatformLobby(
      init,
      options.canvas,
      roomId,
      wsUrl,
      options.config ?? {},
      strictRoom,
    );
    await lobby.bootstrap();
    return lobby;
  }

  static async createFromPlatform(canvas: HTMLCanvasElement, config?: PlatformLobbyConfig) {
    const init = await PlatformBridge.waitForInit();
    return PlatformLobby.create({
      canvas,
      roomId: init.lobby?.roomId ?? `game:${init.game.slug}`,
      strictRoom: init.lobby?.strictRoom,
      platformInit: init,
      config,
      wsUrl: init.lobby?.wsUrl,
    });
  }

  static async createDev(options: PlatformLobbyDevOptions): Promise<PlatformLobby> {
    const init = PlatformBridge.createDevInit({
      mockUser: options.mockUser,
      mockAvatar: options.mockAvatar,
      gameSlug: options.roomId?.replace(/^game:/, '') ?? 'dev-game',
    });
    return PlatformLobby.create({
      canvas: options.canvas,
      roomId: options.roomId ?? init.lobby!.roomId,
      platformInit: init,
      config: { enableMultiplayer: false, ...options.config },
      wsUrl: options.wsUrl ?? init.lobby?.wsUrl,
    });
  }

  private async bootstrap() {
    // Font CDN must never block first paint (can hang >60s on filtered networks).
    void ensureLobbyPersianFont();
    // Warm Draco WASM in parallel with scene setup (HTTP-cached on repeat visits).
    void ensureDracoDecoder();

    this.sceneManager = new SceneManager(this.canvas, this.config);

    const layout = this.config;
    const provisionalSlot = provisionalSpawnSlot(
      this.init.user.id,
      layout.spawnSlotCount ?? layout.spawnPoints?.length ?? 16,
    );
    const spawnPose = resolveSpawnPose(layout, provisionalSlot);

    this.remotePlayers = new RemotePlayerManager(this.sceneManager.scene, this.init.user.id);
    window.addEventListener('resize', this.resizeHandler);

    // Register + fire-and-forget preload so first paint / render loop stay unblocked.
    this.applyConfiguredAvatarBases();

    // Show sky/ground immediately — do not freeze the canvas while the local GLB parses.
    let lastTime = performance.now();
    this.sceneManager.startRenderLoop(() => {
      if (this.destroyed) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (!this.localController) return;

      const tLocal = isLobbyPerfDiagEnabled() ? performance.now() : 0;
      const state = this.localController.update(dt);
      if (isLobbyPerfDiagEnabled()) {
        lobbyPerfNoteLocalUpdate(performance.now() - tLocal);
      }
      this.playground?.update(dt, this.localController, state.position);
      this.sceneManager.followPlayer(
        this.localAvatar.position,
        dt,
        this.localController.getIgnoreMeshes(),
      );
      this.zoneManager.updatePlayer(this.init.user.id, state.position);

      const portalHits = this.portalManager.updatePlayer(this.init.user.id, state.position);
      for (const hit of portalHits) {
        hit.onTrigger?.();
        this.emit('portalTrigger', {
          portalId: hit.portalId,
          toGameSlug: hit.toGameSlug,
          toScene: hit.toScene,
        });
      }

      if (this.lobbyClient?.isConnected() && now - this.lastNetworkSend > 50) {
        this.lastNetworkSend = now;
        this.lobbyClient.sendMove({
          position: state.position,
          rotationY: state.rotationY,
          animation: state.animation,
        });
        this.voiceChat?.refreshMesh();
      }

      this.remotePlayers.update(dt);
    });

    this.localAvatar = await AvatarFactory.createAsync(
      this.sceneManager.scene,
      this.avatar.toSdk(),
      'local-player',
      this.init.user.displayName,
      this.init.user.username,
      { collider: true },
    );
    if (this.destroyed) return;

    this.localController = new LocalPlayerController(
      this.localAvatar,
      spawnPose.position,
      this.sceneManager.scene,
      () => this.sceneManager.camera,
      this.config,
    );
    this.localController.teleportTo(spawnPose.position, spawnPose.rotationY);
    this.localController.setSounds(this.music);
    this.canvas.addEventListener('pointerdown', () => {
      void this.music.unlock(true);
    });

    if (this.config.enableMultiplayer !== false && this.init.session.token !== 'dev-token') {
      this.connectNetwork();
    }

    this.emit('ready', undefined);
    this.ready = true;
    const uiMessages = this.config.uiMessages;
    if (this.config.enableMultiplayer !== false && this.config.enablePresenceUi !== false) {
      this.presenceDispose = attachLobbyPresenceUi(this, uiMessages);
    }
    if (this.config.enableChat !== false) this.attachChat();
    if (this.config.enableVoice !== false && this.config.enableMultiplayer !== false) {
      this.attachVoice();
    }

    if (this.config.enableMultiplayer !== false && this.config.enableConnectionUi !== false) {
      this.connectionDispose = attachLobbyConnectionUi(this, uiMessages);
    }
    if (this.config.enableOrientationUi !== false) {
      this.orientationDispose = attachLobbyOrientationUi({
        locale: this.config.locale,
        messages: uiMessages,
      });
    }

    for (const plugin of this.plugins) {
      void plugin.setup(this);
    }

    if (typeof window !== 'undefined') {
      this.attachDebug(window);
      const perf = attachLobbyPerfDiag(
        () => this.sceneManager.scene,
        () => this.sceneManager.engine,
        window,
      );
      attachRealDeviceAvatarDiag(
        {
          upsertRemote: (player) => this.diagUpsertRemote(player),
          removeRemote: (userId) => this.diagRemoveRemote(userId),
          waitRemote: (userId, timeoutMs) => this.diagWaitRemote(userId, timeoutMs),
          waitRemoteReady: (userId, timeoutMs) => this.diagWaitRemoteReady(userId, timeoutMs),
          applyRemoteMove: (payload) => this.diagApplyRemoteMove(payload),
          isAvatarBaseCached: (id) => this.isAvatarBaseCached(id),
          preloadAvatarBases: (ids) => this.preloadAvatarBases(ids),
          registerAvatarBases: (defs) => this.registerAvatarBases(defs),
          getScene: () => this.sceneManager.scene,
          getEngine: () => this.sceneManager.engine,
        },
        perf,
        window,
      );
      attachPlazaDiag(
        () => this.sceneManager.scene,
        () => this.sceneManager.engine,
        perf,
        window,
      );
      window.__OYNA360_SDK_BUILD__ = 'avatar-join-v13';
      console.info('[lobby-sdk] build avatar-join-v13');
    }
  }

  /**
   * DIAG ONLY: upsert a synthetic remote player for performance measurement.
   * Does not change multiplayer protocol behavior.
   */
  diagUpsertRemote(player: LobbyPlayerState) {
    this.remotePlayers.upsert(player);
  }

  /** DIAG ONLY: remove a synthetic/remote player used for measurement. */
  diagRemoveRemote(userId: string) {
    this.remotePlayers.remove(userId);
  }

  /** DIAG ONLY: wait until a remote userId appears in the remote list (or timeout). */
  async diagWaitRemote(userId: string, timeoutMs = 60_000) {
    const start = performance.now();
    while (performance.now() - start < timeoutMs) {
      if (this.remotePlayers.list().some((p) => p.userId === userId)) return true;
      await new Promise((r) => setTimeout(r, 50));
    }
    return false;
  }

  /** DIAG ONLY: wait until remote GLB/placeholder swap finished. */
  async diagWaitRemoteReady(userId: string, timeoutMs = 60_000) {
    const start = performance.now();
    while (performance.now() - start < timeoutMs) {
      if (this.remotePlayers.isRemoteReady(userId)) return true;
      await new Promise((r) => setTimeout(r, 50));
    }
    return false;
  }

  /** Register shared base avatar GLBs (catalog). Does not load until preload/spawn. */
  registerAvatarBases(defs: readonly AvatarBaseDef[]) {
    AvatarAssetManager.registerAvatarBases(defs);
  }

  registerAvatarBase(def: AvatarBaseDef) {
    AvatarAssetManager.registerAvatarBase(def);
  }

  listAvatarBases(): AvatarBaseDef[] {
    return AvatarAssetManager.listAvatarBases();
  }

  isAvatarBaseCached(id: string): boolean {
    if (!this.sceneManager?.scene) return false;
    return AvatarAssetManager.isAvatarBaseCached(this.sceneManager.scene, id);
  }

  /**
   * Warm container cache for one base. Non-throwing; returns null on failure.
   * Safe to call after bootstrap — does not block the render loop by itself.
   */
  preloadAvatarBase(id: string) {
    return AvatarAssetManager.preloadAvatarBase(this.sceneManager.scene, id);
  }

  /**
   * Warm container cache for bases (all registered if ids omitted).
   * Failures are per-id; lobby continues on the normal async spawn path.
   */
  preloadAvatarBases(ids?: readonly string[]) {
    return AvatarAssetManager.preloadAvatarBases(this.sceneManager.scene, ids);
  }

  /** Apply config.avatarBases + init.avatarBases + optional fire-and-forget preload (non-blocking). */
  private applyConfiguredAvatarBases() {
    const fromConfig = this.config.avatarBases ?? [];
    const fromInit = this.init.avatarBases ?? [];
    const bases = [...fromConfig, ...fromInit];
    if (bases.length) {
      AvatarAssetManager.registerAvatarBases(bases);
    }
    const flag = this.config.preloadAvatarBases;
    if (flag === false) return;
    // Always warm registered bases (config and/or launch catalog) unless explicitly disabled.
    if (!bases.length && flag !== true && !Array.isArray(flag)) return;
    const ids = Array.isArray(flag) ? flag : undefined;
    void AvatarAssetManager.preloadAvatarBases(this.sceneManager.scene, ids).then((results) => {
      const failed = results.filter((r) => !r.ok);
      if (failed.length) {
        console.warn(
          '[lobby-sdk] avatar base preload incomplete',
          failed.map((f) => f.id),
        );
      }
    });
  }

  /** DIAG ONLY: update synthetic remote move/animation targets (no network). */
  diagApplyRemoteMove(payload: {
    userId: string;
    position?: LobbyPlayerState['position'];
    rotationY?: number;
    animation?: import('@oyna360/lobby-sdk').LobbyAnimationState;
  }) {
    this.remotePlayers.applyMove(payload);
  }

  private connectNetwork() {
    this.voiceChat = new LobbyVoiceChat({
      sendJoin: (mode) => this.lobbyClient?.sendVoiceJoin(mode),
      sendLeave: () => this.lobbyClient?.sendVoiceLeave(),
      sendMute: (muted) => this.lobbyClient?.sendVoiceMute(muted),
      sendOffer: (toUserId, sdp) => this.lobbyClient?.sendVoiceOffer(toUserId, sdp),
      sendAnswer: (toUserId, sdp) => this.lobbyClient?.sendVoiceAnswer(toUserId, sdp),
      sendIce: (toUserId, candidate) => this.lobbyClient?.sendVoiceIce(toUserId, candidate),
    });
    this.voiceChat.setContext(this.init.user.id, []);
    this.voiceChat.setPositionProvider((userId) => {
      if (userId === this.init.user.id) {
        return this.localController.getState().position;
      }
      return this.remotePlayers.getPosition(userId);
    });

    const client = LobbyClient.create({
      platformInit: this.init,
      wsUrl: this.wsUrl,
      roomId: this.roomId,
      strictRoom: this.strictRoom,
      avatar: this.avatar,
    });
    this.lobbyClient = client;
    this.bindLobbyClient(client);
    client.connect();
  }

  /** Wire Core events → Babylon render + public PlatformLobby events. */
  private bindLobbyClient(client: LobbyClient) {
    client.on('welcome', ({ self, players, meta }) => {
      this.localController.teleportTo(self.position, self.rotationY);
      if (meta?.lobbyFeatures) this.lobbyFeatures = meta.lobbyFeatures;
      this.voiceChat?.setContext(this.init.user.id, meta?.friendUserIds ?? []);
      if (meta?.voicePeers) {
        this.voiceChat?.handleVoiceState(meta.voicePeers, meta?.friendUserIds ?? []);
      }
      for (const p of players) this.remotePlayers.upsert(p);
      this.emit('connected', undefined);
    });

    client.on('player:join', (player) => {
      this.remotePlayers.upsert(player);
      this.emit('playerJoined', {
        userId: player.userId,
        displayName: player.displayName,
        username: player.username,
      });
    });

    client.on('player:leave', (payload) => {
      const info = this.remotePlayers.getIdentity(payload.userId);
      this.remotePlayers.remove(payload.userId);
      this.emit('playerLeft', {
        userId: payload.userId,
        displayName: payload.displayName ?? info?.displayName,
        username: payload.username ?? info?.username,
      });
    });

    client.on('player:update', (player) => {
      if (player.userId === this.init.user.id) return;
      this.remotePlayers.applyMove({
        userId: player.userId,
        position: player.position,
        rotationY: player.rotationY,
        animation: player.animation,
      });
    });

    client.on('player:emote', ({ userId, emote }) => {
      this.remotePlayers.applyEmote(userId, emote);
    });

    client.on('player:avatar', ({ userId, player, emote }) => {
      if (userId === this.init.user.id) return;
      // Respawn remote with new avatar via existing pipeline (no AvatarFactory rewrite).
      this.remotePlayers.remove(userId);
      this.remotePlayers.upsert(player);
      if (emote) this.remotePlayers.applyEmote(userId, emote);
      this.emit('playerAvatar', {
        userId,
        avatar: player.avatar,
        displayName: player.displayName,
        username: player.username,
      });
    });

    client.on('chat', (payload) => {
      if (payload.userId === this.init.user.id) return;
      this.emit('chat', payload);
    });

    client.on('data', (payload) => {
      if (payload.userId === this.init.user.id) return;
      this.emit('data', payload);
    });

    client.on('voice:state', ({ peers, friendUserIds }) => {
      this.voiceChat?.handleVoiceState(peers, friendUserIds);
    });
    client.on('voice:joined', (peer) => {
      this.voiceChat?.handleVoiceJoined(peer);
    });
    client.on('voice:left', ({ userId }) => {
      this.voiceChat?.handleVoiceLeft(userId);
    });
    client.on('voice:mute', ({ userId, muted }) => {
      this.voiceChat?.handleVoiceMute(userId, muted);
    });
    client.on('voice:offer', ({ fromUserId, sdp }) => {
      void this.voiceChat?.handleOffer(fromUserId, sdp);
    });
    client.on('voice:answer', ({ fromUserId, sdp }) => {
      void this.voiceChat?.handleAnswer(fromUserId, sdp);
    });
    client.on('voice:ice', ({ fromUserId, candidate }) => {
      void this.voiceChat?.handleIce(fromUserId, candidate);
    });

    client.on('error', (payload) => {
      this.emit('error', payload);
    });
    client.on('disconnected', () => {
      this.emit('disconnected', undefined);
    });
    client.on('reconnecting', (payload) => {
      this.emit('reconnecting', payload);
    });
    client.on('reconnectFailed', () => {
      this.emit('reconnectFailed', undefined);
    });
  }

  on<E extends LobbyEventName>(event: E, handler: (payload: LobbyEventMap[E]) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler as (payload: unknown) => void);
    if (event === 'ready' && this.ready) {
      handler(undefined as LobbyEventMap[E]);
    }
    return () => this.off(event, handler);
  }

  off<E extends LobbyEventName>(event: E, handler: (payload: LobbyEventMap[E]) => void) {
    this.listeners.get(event)?.delete(handler as (payload: unknown) => void);
  }

  private emit<E extends LobbyEventName>(event: E, payload: LobbyEventMap[E]) {
    for (const handler of this.listeners.get(event) ?? []) {
      handler(payload);
    }
  }

  use(plugin: LobbyPlugin) {
    this.plugins.push(plugin);
    if (this.ready) void plugin.setup(this);
    return this;
  }

  /** Optional starter-plaza template. Appearance and start routing stay in the game. */
  applyPlazaLayout(config?: PlazaLayoutConfig) {
    applyPlazaLayoutFn(this, config);
    applyLobbyCollisions(this.sceneManager.scene);
    if (!this.playground) this.playground = attachPlayground(this);
    return this;
  }

  applyStarterLayout(config?: StarterLayoutConfig) {
    applyStarterLayoutFn(this, config);
    applyLobbyCollisions(this.sceneManager.scene);
    return this;
  }

  attachDebug(win?: Window) {
    return attachLobbyDebug(this, win ?? window);
  }

  getDebugReport() {
    return buildLobbyDebugReport(this);
  }

  addZone(options: LobbyZoneOptions) {
    this.zoneManager.addZone({
      id: options.id,
      bounds: options.bounds,
      onEnter: (playerId) => {
        options.onEnter?.(playerId);
        this.emit('zoneEnter', { zoneId: options.id, playerId });
      },
      onExit: (playerId) => {
        options.onExit?.(playerId);
        this.emit('zoneExit', { zoneId: options.id, playerId });
      },
    });
  }

  /**
   * Game-owned portal. The SDK only detects the player and fires `onTrigger` / `portalTrigger`.
   * It never navigates the browser — the game starts its own gameplay.
   */
  addPortal(options: LobbyPortalOptions) {
    this.portalManager.addPortal(options);
  }

  /** Platform identity: user, avatar, session, room. */
  getSession() {
    return this.init.session;
  }

  getUser() {
    return this.init.user;
  }

  getAvatar(): SdkLobbyAvatar {
    return this.avatar.toSdk();
  }

  /**
   * Push Core AvatarState into the existing Babylon avatar pipeline.
   * Does not rewrite AvatarFactory — only setTint / setBaseAlbedo / accessories.
   * Base model swap (new GLB) updates state for getAvatar()/next spawn only.
   */
  private async applyLocalAvatarState() {
    if (this.destroyed || this.applyingAvatarState) return;
    const sdk = this.avatar.toSdk();
    Object.assign(this.init.avatar, sdk);
    this.init.avatar.customConfig = { ...sdk.customConfig };

    if (!this.ready || !this.localController) return;
    this.applyingAvatarState = true;
    try {
      const root = this.localController.root;
      const cfg = sdk.customConfig as Record<string, unknown>;
      AvatarFactory.setTint(root, readTintFromConfig(cfg));
      AvatarFactory.setBaseAlbedo(root, readBaseAlbedoUrlFromConfig(cfg));
      await attachAccessoriesFromAvatarConfig(this.sceneManager.scene, root, cfg);
    } catch (err) {
      console.warn('[lobby-sdk] applyLocalAvatarState failed', err);
    } finally {
      this.applyingAvatarState = false;
    }
  }

  /** Other players currently synced in this lobby room (Core SoT; excludes self). */
  getPlayers() {
    return this.lobbyClient?.getRemotePlayers() ?? [];
  }

  async loadGLB(url: string, name?: string) {
    const result = await SceneLoader.ImportMeshAsync('', url, undefined, this.sceneManager.scene);
    const root = result.meshes[0];
    if (name) root.name = name;
    return root;
  }

  onOverlay(id: string, handler: (payload: unknown) => void) {
    this.overlayHandlers.set(id, handler);
  }

  emitOverlay(id: string, payload: unknown) {
    this.overlayHandlers.get(id)?.(payload);
  }

  playEmote(emote: LobbyEmoteKind) {
    this.lobbyClient?.sendEmote(emote);
  }

  /** Live lobby chat. Not saved. Always echoes locally so the sender sees the line. */
  sendChat(text: string) {
    if (!this.canUseChat()) return false;
    const clean = sanitizeLobbyChat(text);
    if (!clean) return false;
    this.emit('chat', {
      userId: this.init.user.id,
      username: this.init.user.username,
      displayName: this.init.user.displayName,
      text: clean,
      at: Date.now(),
    });
    this.lobbyClient?.sendChat(clean);
    return true;
  }

  /**
   * Ephemeral game data for this lobby room (matchmaking, pad sync, …).
   * Independent of chat — works when chat is disabled/banned.
   * Local-echoes so the sender sees the same `data` event as peers.
   * Prefer namespaced channels: `{gameSlug}.{feature}` (e.g. `fc.pad-room`).
   */
  sendData(channel: string, payload: string): boolean {
    if (!this.canUseData()) return false;
    const ch = sanitizeLobbyDataChannel(channel);
    const body = sanitizeLobbyDataPayload(payload);
    if (!ch || !body) return false;
    if (!this.lobbyClient?.isConnected()) return false;
    this.emit('data', {
      userId: this.init.user.id,
      username: this.init.user.username,
      displayName: this.init.user.displayName,
      channel: ch,
      payload: body,
      at: Date.now(),
    });
    this.lobbyClient.sendData(ch, body);
    return true;
  }

  attachChat() {
    if (this.chatDispose) return this;
    this.chatDispose = attachLobbyChatUi(this, this.canvas);
    return this;
  }

  attachVoice() {
    if (this.voiceDispose || !this.voiceChat) return this;
    this.voiceDispose = attachLobbyVoiceUi(this);
    return this;
  }

  getVoiceChat() {
    return this.voiceChat;
  }

  getLobbyFeatures() {
    return this.lobbyFeatures;
  }

  canUseChat() {
    return this.lobbyFeatures.chatEnabled && this.lobbyFeatures.chatAllowed;
  }

  /** Game data channel — defaults on when flags are omitted. */
  canUseData() {
    return this.lobbyFeatures.dataEnabled !== false && this.lobbyFeatures.dataAllowed !== false;
  }

  canUseVoice() {
    return this.lobbyFeatures.voiceEnabled && this.lobbyFeatures.voiceAllowed;
  }

  /** Virtual joystick / on-screen pad. x = strafe, z = forward (-1..1). */
  setMoveStick(x: number, z: number) {
    this.localController.setStick(x, z);
  }

  setLookStick(x: number, y: number) {
    this.sceneManager.thirdPerson.setLookStick(x, y);
  }

  addLookDelta(dx: number, dy: number) {
    this.sceneManager.thirdPerson.addLookDelta(dx, dy);
  }

  /** Game-side camera distance (third-person orbit radius). */
  setCameraOrbit(radius: number, limits?: { lower?: number; upper?: number }) {
    const tp = this.sceneManager.thirdPerson;
    const cam = tp.camera;
    if (typeof limits?.lower === 'number') cam.lowerRadiusLimit = limits.lower;
    if (typeof limits?.upper === 'number') cam.upperRadiusLimit = limits.upper;
    const clamped = Math.min(
      cam.upperRadiusLimit ?? 16,
      Math.max(cam.lowerRadiusLimit ?? 2.2, radius),
    );
    tp.wantedRadius = clamped;
    cam.radius = clamped;
  }

  tryPlaygroundInteract() {
    return this.playground?.trySlide() ?? false;
  }

  getLocalController() {
    return this.localController;
  }

  noteMusicToggle() {
    this.music.noteUserToggled();
  }

  toggleMusic() {
    return this.music.toggleMuted();
  }

  setMusicMuted(muted: boolean) {
    this.music.setMuted(muted);
  }

  isMusicMuted() {
    return this.music.isMuted();
  }

  jump() {
    this.localController.jump();
  }

  setJumpHeld(on: boolean) {
    this.localController.setJumpHeld(on);
  }

  setSprint(on: boolean) {
    this.localController.setSprint(on);
  }

  /** Ask the hub to close this lobby iframe and return home. Never navigates itself. */
  requestExit() {
    if (typeof window === 'undefined' || window.parent === window) return;
    const target = (() => {
      const raw = window.__OYNA360_DEV__?.platformWebUrl;
      if (raw) {
        try {
          return new URL(raw).origin;
        } catch {
          /* ignore */
        }
      }
      try {
        if (document.referrer) return new URL(document.referrer).origin;
      } catch {
        /* ignore */
      }
      return '*';
    })();
    const token = this.init.session?.token;
    if (token) {
      window.parent.postMessage({ type: 'platform:session:end', sessionToken: token }, target);
    }
    window.parent.postMessage({ type: 'platform:lobby:exit' }, target);
  }

  getInitPayload() {
    return this.init;
  }

  getLocalPose() {
    return this.localController.getState();
  }

  getScene() {
    return this.sceneManager.scene;
  }

  getUiLocale() {
    return this.config.locale === 'en' ? 'en' : 'fa';
  }

  getEngine() {
    return this.sceneManager.engine;
  }

  addMeshAt(position: Vector3, size = 1) {
    const box = MeshBuilder.CreateBox('custom-mesh', { size }, this.sceneManager.scene);
    box.position = new BVector3(position.x, position.y + size / 2, position.z);
    return box;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unsubAvatarChange?.();
    this.unsubAvatarChange = null;
    window.removeEventListener('resize', this.resizeHandler);
    this.chatDispose?.();
    this.chatDispose = null;
    this.presenceDispose?.();
    this.presenceDispose = null;
    this.voiceDispose?.();
    this.voiceDispose = null;
    this.connectionDispose?.();
    this.connectionDispose = null;
    this.orientationDispose?.();
    this.orientationDispose = null;
    this.voiceChat?.dispose();
    this.voiceChat = null;
    this.lobbyClient?.destroy();
    this.lobbyClient = null;
    this.localController.dispose();
    this.music.dispose();
    this.playground?.dispose();
    this.remotePlayers.dispose();
    this.sceneManager.dispose();
    this.zoneManager.clear();
    this.portalManager.clear();
    this.emit('destroyed', undefined);
  }
}
