import React from "react";
import { render, act } from "@testing-library/react-native";
import NetworkToast from "../NetworkToast";

type NetInfoState = { isConnected: boolean | null; isInternetReachable: boolean | null };
type NetInfoListener = (state: NetInfoState) => void;

let capturedListener: NetInfoListener | null = null;

jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn((cb: NetInfoListener) => {
    capturedListener = cb;
    return jest.fn();
  }),
}));

const triggerNetInfo = async (state: NetInfoState) => {
  await act(async () => {
    capturedListener?.(state);
  });
};

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ["setImmediate", "nextTick"] });
  capturedListener = null;
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

// ─── état initial ─────────────────────────────────────────────────────────────

describe("NetworkToast — état initial", () => {
  it("ne rend rien sans événement réseau", async () => {
    const { toJSON } = await render(<NetworkToast />);
    expect(toJSON()).toBeNull();
  });

  it("ne rend rien si connexion OK au premier check", async () => {
    const { toJSON } = await render(<NetworkToast />);
    await triggerNetInfo({ isConnected: true, isInternetReachable: true });
    expect(toJSON()).toBeNull();
  });
});

// ─── hors ligne ───────────────────────────────────────────────────────────────

describe("NetworkToast — hors ligne", () => {
  it("affiche 'Pas de connexion internet' au premier check si déconnecté", async () => {
    const { getByText } = await render(<NetworkToast />);
    await triggerNetInfo({ isConnected: false, isInternetReachable: false });
    expect(getByText("Pas de connexion internet")).toBeTruthy();
  });

  it("affiche 'Pas de connexion internet' sur déconnexion en cours d'utilisation", async () => {
    const { getByText } = await render(<NetworkToast />);
    await triggerNetInfo({ isConnected: true, isInternetReachable: true });
    await triggerNetInfo({ isConnected: false, isInternetReachable: false });
    expect(getByText("Pas de connexion internet")).toBeTruthy();
  });

  it("isInternetReachable=null avec isConnected=true → considéré connecté", async () => {
    const { toJSON } = await render(<NetworkToast />);
    await triggerNetInfo({ isConnected: true, isInternetReachable: null });
    expect(toJSON()).toBeNull();
  });
});

// ─── connexion rétablie ───────────────────────────────────────────────────────

describe("NetworkToast — connexion rétablie", () => {
  it("affiche 'Connexion rétablie' après reconnexion", async () => {
    const { getByText } = await render(<NetworkToast />);
    await triggerNetInfo({ isConnected: true, isInternetReachable: true });
    await triggerNetInfo({ isConnected: false, isInternetReachable: false });
    await triggerNetInfo({ isConnected: true, isInternetReachable: true });
    expect(getByText("Connexion rétablie")).toBeTruthy();
  });

  it("masque le toast après 2s lors d'une reconnexion", async () => {
    const { queryByText } = await render(<NetworkToast />);
    await triggerNetInfo({ isConnected: true, isInternetReachable: true });
    await triggerNetInfo({ isConnected: false, isInternetReachable: false });
    await triggerNetInfo({ isConnected: true, isInternetReachable: true });
    await act(() => { jest.advanceTimersByTime(3000); });
    expect(queryByText("Connexion rétablie")).toBeNull();
  });
});
