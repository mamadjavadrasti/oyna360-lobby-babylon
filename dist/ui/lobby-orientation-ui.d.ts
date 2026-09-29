import { type LobbyUiLocale, type LobbyUiMessages } from '@oyna360/lobby-sdk';
/**
 * On mobile portrait, shows a full-screen landscape prompt.
 * Auto-hides when the device goes landscape or on desktop.
 */
export declare function attachLobbyOrientationUi(options?: {
    locale?: LobbyUiLocale;
    messages?: Partial<LobbyUiMessages>;
}): () => void;
//# sourceMappingURL=lobby-orientation-ui.d.ts.map