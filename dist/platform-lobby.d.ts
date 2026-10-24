import '@babylonjs/loaders/glTF';
import type { SdkInitPayload, SdkLobbyAvatar } from '@oyna360/lobby-sdk';
import { type LobbyEmoteKind, type LobbyPlayerState, type LobbyFeatureFlags } from '@oyna360/lobby-sdk';
import { type AvatarBaseDef } from './avatar-asset-manager';
import { LocalPlayerController } from './local-player-controller';
import { LobbyAvatarController } from '@oyna360/lobby-sdk';
import type { LobbyPlugin } from '@oyna360/lobby-sdk';
import { type StarterLayoutConfig } from './starter-layout';
import { type PlazaLayoutConfig } from './plaza-layout';
import { LobbyVoiceChat } from '@oyna360/lobby-sdk';
import type { LobbyEventMap, LobbyEventName, LobbyPortalOptions, LobbyZoneOptions, PlatformLobbyConfig, PlatformLobbyCreateOptions, PlatformLobbyDevOptions, Vector3 } from '@oyna360/lobby-sdk';
export declare class PlatformLobby {
    private readonly canvas;
    private readonly strictRoom;
    private readonly init;
    private readonly config;
    private readonly roomId;
    private readonly wsUrl;
    /** Local avatar customization (Core state). Games use lobby.avatar.*. */
    readonly avatar: LobbyAvatarController;
    private sceneManager;
    private localAvatar;
    private localController;
    private remotePlayers;
    /** Core session — source of truth for room/player network state. */
    private lobbyClient;
    private zoneManager;
    private portalManager;
    private plugins;
    private overlayHandlers;
    private listeners;
    private lastNetworkSend;
    private destroyed;
    private ready;
    private playground;
    private music;
    private chatDispose;
    private presenceDispose;
    private voiceDispose;
    private connectionDispose;
    private orientationDispose;
    private voiceChat;
    private communications;
    private lobbyFeatures;
    private resizeHandler;
    private unsubAvatarChange;
    private applyingAvatarState;
    private avatarStateDirty;
    private constructor();
    static create(options: PlatformLobbyCreateOptions): Promise<PlatformLobby>;
    static createFromPlatform(canvas: HTMLCanvasElement, config?: PlatformLobbyConfig): Promise<PlatformLobby>;
    static createDev(options: PlatformLobbyDevOptions): Promise<PlatformLobby>;
    private bootstrap;
    /**
     * DIAG ONLY: upsert a synthetic remote player for performance measurement.
     * Does not change multiplayer protocol behavior.
     */
    diagUpsertRemote(player: LobbyPlayerState): void;
    /** DIAG ONLY: remove a synthetic/remote player used for measurement. */
    diagRemoveRemote(userId: string): void;
    /** DIAG ONLY: wait until a remote userId appears in the remote list (or timeout). */
    diagWaitRemote(userId: string, timeoutMs?: number): Promise<boolean>;
    /** DIAG ONLY: wait until remote GLB/placeholder swap finished. */
    diagWaitRemoteReady(userId: string, timeoutMs?: number): Promise<boolean>;
    /** Register shared base avatar GLBs (catalog). Does not load until preload/spawn. */
    registerAvatarBases(defs: readonly AvatarBaseDef[]): void;
    registerAvatarBase(def: AvatarBaseDef): void;
    listAvatarBases(): AvatarBaseDef[];
    isAvatarBaseCached(id: string): boolean;
    /**
     * Warm container cache for one base. Non-throwing; returns null on failure.
     * Safe to call after bootstrap — does not block the render loop by itself.
     */
    preloadAvatarBase(id: string): Promise<import("@babylonjs/core").AssetContainer | null>;
    /**
     * Warm container cache for bases (all registered if ids omitted).
     * Failures are per-id; lobby continues on the normal async spawn path.
     */
    preloadAvatarBases(ids?: readonly string[]): Promise<{
        id: string;
        ok: boolean;
    }[]>;
    /** Apply config.avatarBases + init.avatarBases + optional fire-and-forget preload (non-blocking). */
    private applyConfiguredAvatarBases;
    /** DIAG ONLY: update synthetic remote move/animation targets (no network). */
    diagApplyRemoteMove(payload: {
        userId: string;
        position?: LobbyPlayerState['position'];
        rotationY?: number;
        animation?: import('@oyna360/lobby-sdk').LobbyAnimationState;
    }): void;
    private connectNetwork;
    /** Wire Core events → Babylon render + public PlatformLobby events. */
    private bindLobbyClient;
    on<E extends LobbyEventName>(event: E, handler: (payload: LobbyEventMap[E]) => void): () => void;
    off<E extends LobbyEventName>(event: E, handler: (payload: LobbyEventMap[E]) => void): void;
    private emit;
    use(plugin: LobbyPlugin): this;
    /** Optional starter-plaza template. Appearance and start routing stay in the game. */
    applyPlazaLayout(config?: PlazaLayoutConfig): this;
    applyStarterLayout(config?: StarterLayoutConfig): this;
    attachDebug(win?: Window): import("./lobby-debug").LobbyDebugHandle;
    getDebugReport(): import("./lobby-debug").LobbyDebugReport;
    addZone(options: LobbyZoneOptions): void;
    /**
     * Game-owned portal. The SDK only detects the player and fires `onTrigger` / `portalTrigger`.
     * It never navigates the browser — the game starts its own gameplay.
     */
    addPortal(options: LobbyPortalOptions): void;
    /** Platform identity: user, avatar, session, room. */
    getSession(): import("@oyna360/lobby-sdk").SdkSession;
    getUser(): import("@oyna360/lobby-sdk").SdkUser;
    getAvatar(): SdkLobbyAvatar;
    /**
     * Push Core AvatarState into the existing Babylon avatar pipeline.
     * Does not rewrite AvatarFactory — only setTint / setBaseAlbedo / accessories.
     * Base model swap (new GLB) updates state for getAvatar()/next spawn only.
     */
    private applyLocalAvatarState;
    /** Other players currently synced in this lobby room (Core SoT; excludes self). */
    getPlayers(): LobbyPlayerState[];
    loadGLB(url: string, name?: string): Promise<import("@babylonjs/core").AbstractMesh>;
    onOverlay(id: string, handler: (payload: unknown) => void): void;
    emitOverlay(id: string, payload: unknown): void;
    playEmote(emote: LobbyEmoteKind): void;
    /** Live lobby chat. Not saved. Always echoes locally so the sender sees the line. */
    sendChat(text: string): boolean;
    /**
     * Ephemeral game data for this lobby room (matchmaking, pad sync, …).
     * Independent of chat — works when chat is disabled/banned.
     * Local-echoes so the sender sees the same `data` event as peers.
     * Prefer namespaced channels: `{gameSlug}.{feature}` (e.g. `fc.pad-room`).
     */
    sendData(channel: string, payload: string): boolean;
    attachChat(): this;
    attachVoice(): this;
    getVoiceChat(): LobbyVoiceChat | null;
    getLobbyFeatures(): LobbyFeatureFlags;
    canUseChat(): boolean;
    /** Game data channel — defaults on when flags are omitted. */
    canUseData(): boolean;
    canUseVoice(): boolean;
    /** Public lobby calls must be enabled explicitly; friends-group calls are the default. */
    canUseLobbyVoice(): boolean;
    /** Virtual joystick / on-screen pad. x = strafe, z = forward (-1..1). */
    setMoveStick(x: number, z: number): void;
    setLookStick(x: number, y: number): void;
    addLookDelta(dx: number, dy: number): void;
    /** Game-side camera distance (third-person orbit radius). */
    setCameraOrbit(radius: number, limits?: {
        lower?: number;
        upper?: number;
    }): void;
    tryPlaygroundInteract(): boolean;
    getLocalController(): LocalPlayerController;
    noteMusicToggle(): void;
    toggleMusic(): boolean;
    setMusicMuted(muted: boolean): void;
    isMusicMuted(): boolean;
    jump(): void;
    setJumpHeld(on: boolean): void;
    setSprint(on: boolean): void;
    /** Ask the hub to close this lobby iframe and return home. Never navigates itself. */
    requestExit(): void;
    getInitPayload(): SdkInitPayload;
    getLocalPose(): {
        position: {
            x: number;
            y: number;
            z: number;
        };
        rotationY: number;
        animation: import("@oyna360/lobby-sdk").LobbyAnimationState;
    };
    getScene(): import("@babylonjs/core").Scene;
    getUiLocale(): "fa" | "en";
    getEngine(): import("@babylonjs/core").Engine;
    addMeshAt(position: Vector3, size?: number): import("@babylonjs/core").Mesh;
    destroy(): void;
}
//# sourceMappingURL=platform-lobby.d.ts.map