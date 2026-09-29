/**
 * @oyna360/lobby-babylon — Babylon.js lobby renderer.
 * Depends on @oyna360/lobby-sdk (Core). Does not own protocol/network.
 */

export const LOBBY_BABYLON_BUILD = 'avatar-join-v13';

export { PlatformLobby } from './platform-lobby.js';
export { SceneManager } from './scene-manager.js';
export {
  AvatarFactory,
  applyAvatarTint,
  applyAvatarBaseAlbedo,
  readBaseAlbedoUrlFromConfig,
  readTintFromConfig,
} from './avatar-factory.js';
export { AvatarAssetManager, assetCacheKey } from './avatar-asset-manager.js';
export type { GlbInstance, AvatarBaseDef } from './avatar-asset-manager.js';
export { AvatarInstance } from './avatar-instance.js';
export type { RemoteAvatarLifecycle } from './avatar-instance.js';
export { AvatarRigBuilder } from './avatar-rig-builder.js';
export type { AvatarRig } from './avatar-rig-builder.js';
export { attachAvatarAccessories, attachAccessoriesFromAvatarConfig } from './avatar-accessories.js';
export type { EquippedAccessory, AccessoryPrimitive } from './avatar-accessories.js';
export { RemotePlayerManager } from './remote-player-manager.js';
export { LocalPlayerController } from './local-player-controller.js';
export { ThirdPersonCamera } from './third-person-camera.js';
export {
  applyLobbyCollisions,
  syncCharacterObstacle,
  removeCharacterObstacle,
} from './lobby-colliders.js';
export { applyStarterLayout, createPortalVisual } from './starter-layout.js';
export type { StarterLayoutConfig } from './starter-layout.js';
export { applyPlazaLayout, DEFAULT_PLAZA_ROOMS } from './plaza-layout.js';
export type { PlazaLayoutConfig, PlazaRoomDef } from './plaza-layout.js';
export { HumanoidAnimator } from './humanoid-animator.js';
export { buildHumanoidBoneRig, applyHumanoidPose } from './humanoid-rig.js';
export type { HumanoidBoneRig, HumanoidJointControl } from './humanoid-rig.js';
export { attachLobbyDebug, buildLobbyDebugReport, setLobbyCameraPreset } from './lobby-debug.js';
export type {
  LobbyDebugReport,
  LobbyDebugCheck,
  LobbyDebugHandle,
  LobbyCameraPreset,
} from './lobby-debug.js';
export {
  attachLobbyPerfDiag,
  captureLobbyPerfSnapshot,
  sampleLobbyPerf,
  setLobbyPerfDiagEnabled,
  resetLobbyPerfDiag,
  isLobbyPerfDiagEnabled,
  diagSetAlwaysSelectAsActiveMesh,
  diagSetAvatarDoubleSide,
  diagSetDisableUniformBuffers,
  getLobbyPerfPhaseSummary,
  captureLobbyPerfMemory,
  collectLobbyAvatarCosts,
  extractSpawnTimelineFromMarks,
  summarizeAvatarRenderCosts,
  sampleAvatarRender,
  captureWebGlInfo,
} from './lobby-perf-diag.js';
export type {
  LobbyPerfSnapshot,
  LobbyPerfSampleSeries,
  LobbyPerfDiagHandle,
  LobbyPerfPhase,
  LobbyPerfPhaseStat,
  LobbyPerfPhaseDist,
  LobbyPerfMemoryInfo,
  LobbyPerfAvatarCost,
  AvatarRenderCostSummary,
  AvatarRenderSample,
} from './lobby-perf-diag.js';
export {
  attachRealDeviceAvatarDiag,
  captureRealDeviceInfo,
  runRealDeviceAvatarSuite,
} from './lobby-real-device-diag.js';
export type {
  RealDeviceLobbyBridge,
  RealDeviceSuiteOptions,
  RealDeviceAvatarReport,
  RealDeviceInfo,
} from './lobby-real-device-diag.js';
export {
  attachPlazaDiag,
  runPlazaDiagSuite,
  inventoryPlazaSubsystems,
  classifyPlazaMesh,
  PLAZA_MESH_SUBSYSTEMS,
} from './lobby-plaza-diag.js';
export type {
  PlazaSubsystemId,
  PlazaSubsystemInventory,
  PlazaDiagReport,
  PlazaDiagSuiteOptions,
  PlazaDiagSample,
} from './lobby-plaza-diag.js';
export { attachNameTag } from './name-tag.js';
export { attachPlayground } from './playground/playground-system.js';
export { SLIDE_ANCHOR, TRAMPOLINE_ANCHOR } from './playground/playground-layout.js';
export { attachLobbyChatUi } from './ui/lobby-chat-ui.js';
export { attachLobbyPresenceUi } from './ui/lobby-presence-ui.js';
export { attachLobbyVoiceUi } from './ui/lobby-voice-ui.js';
export { attachLobbyConnectionUi } from './ui/lobby-connection-ui.js';
export { attachLobbyOrientationUi } from './ui/lobby-orientation-ui.js';

/** Convenience: re-export Core so games can depend on lobby-babylon alone. */
export {
  LOBBY_SDK_BUILD,
  LobbyClient,
  LobbyAvatarController,
  PlatformBridge,
  NetworkClient,
  ZoneManager,
  PortalManager,
  LobbyMusic,
  LobbyVoiceChat,
  resolveGlbUrl,
  pickAvatarClip,
  dedupeClipsByName,
  AVATAR_CLIP_ALIASES,
  HumanoidPose,
  HUMANOID_JOINTS,
  HUMANOID_JOINT_INDEX,
  WALK_GAIT,
  RUN_GAIT,
  approach,
  cloneGait,
  footContacts,
  gaitFrequency,
  lerpGait,
  writeAirPose,
  writeGaitPose,
  writeIdlePose,
  writeSlidePose,
  formatPlayerLabel,
  formatPlayerLabelParts,
  formatPlayerHandle,
  formatAvatarTagLabel,
  DEFAULT_LOBBY_SPAWN,
  lobbySpawnPose,
  provisionalSpawnSlot,
  resolveSpawnPose,
  spawnLayoutFromConfig,
  ensureLobbyPersianFont,
  lobbyCanvasFont,
  LOBBY_UI_FONT,
  resolveLobbyUiMessages,
  LOBBY_QUALITY,
  detectLobbyQuality,
  isTouchDevice,
  lobbyQualitySettings,
  resolveLobbyQuality,
  shouldDisableLobbyBloom,
  shouldTrimAvatarDetailMaps,
  remoteAvatarAnimStride,
  LOBBY_AVATAR_ANIM_FULL_DIST,
  LOBBY_AVATAR_ANIM_HALF_DIST,
  LOBBY_AVATAR_ANIM_QUARTER_DIST,
  LOBBY_PROTOCOL_VERSION,
  GLOBAL_AVATAR_ROOM_ID,
  gameRoomId,
  isRoomForGame,
  parseGameSlugFromRoom,
  LOBBY_CHAT_MAX_LEN,
  LOBBY_DATA_MAX_LEN,
  LOBBY_DATA_CHANNEL_MAX_LEN,
  sanitizeLobbyChat,
  sanitizeLobbyDataChannel,
  sanitizeLobbyDataPayload,
  sanitizeLobbyAvatarUpdate,
  defineLobbyPlugin,
  ShopZonePlugin,
  LeaderboardZonePlugin,
  avatarStateFromSdk,
  avatarStateToSdk,
  cloneAvatarState,
  avatarFromPlayer,
} from '@oyna360/lobby-sdk';

export type {
  LobbyClientConnectOptions,
  LobbyClientEvents,
  LobbyNetworkLike,
  LobbyWelcomeMeta,
  AvatarState,
  AvatarStateView,
  AvatarSkin,
  AvatarAccessory,
  AvatarAttachment,
  AvatarVec3,
  AvatarStateChangeEvent,
  SetBaseInput,
  PlatformLobbyConfig,
  PlatformLobbyCreateOptions,
  PlatformLobbyDevOptions,
  LobbyZoneOptions,
  LobbyPortalOptions,
  LobbyPlugin,
  LobbyEventMap,
  LobbyEventName,
  Vector3,
  GaitParams,
  HumanoidJoint,
  LobbyUiLocale,
  LobbyUiMessages,
  LobbyQualityLevel,
  LobbyQualitySettings,
  LobbySpawnLayout,
  LobbySpawnPose,
  VoiceChatState,
  VoiceSignaling,
  LobbyVoiceMode,
  LobbyVoicePeerState,
  LobbyFeatureFlags,
  LobbyAnimationState,
} from '@oyna360/lobby-sdk';
