import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import SearchingDriverModal from "../SearchingDriverModal";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("react-native-paper", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Icon: ({ source }: { source: string }) =>
      React.createElement(Text, { testID: `icon-${source}` }, source),
  };
});

const baseProps = {
  visible: true,
  noDriverFound: false,
  searchCountdown: 120,
  onCancel: jest.fn(),
  onRetry: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

// ─── visibilité ───────────────────────────────────────────────────────────────

describe("SearchingDriverModal — visibilité", () => {
  it("affiche le contenu quand visible=true", async () => {
    const { getByText } = await render(<SearchingDriverModal {...baseProps} />);
    expect(getByText("searching_drivers")).toBeTruthy();
  });

  it("n'affiche pas le contenu quand visible=false", async () => {
    const { queryByText } = await render(
      <SearchingDriverModal {...baseProps} visible={false} />
    );
    expect(queryByText("searching_drivers")).toBeNull();
  });
});

// ─── mode recherche ───────────────────────────────────────────────────────────

describe("SearchingDriverModal — mode recherche (noDriverFound=false)", () => {
  it("affiche 'searching_drivers'", async () => {
    const { getByText } = await render(<SearchingDriverModal {...baseProps} />);
    expect(getByText("searching_drivers")).toBeTruthy();
  });

  it("affiche le countdown formaté MM:SS", async () => {
    const { getByText } = await render(
      <SearchingDriverModal {...baseProps} searchCountdown={125} />
    );
    expect(getByText("02:05")).toBeTruthy();
  });

  it("countdown 0s → '…' (la recherche continue, pas d'échec)", async () => {
    const { getByText, queryByText } = await render(
      <SearchingDriverModal {...baseProps} searchCountdown={0} />
    );
    expect(getByText("…")).toBeTruthy();
    expect(queryByText("00:00")).toBeNull();
  });

  it("affiche bouton 'cancel'", async () => {
    const { getByText } = await render(<SearchingDriverModal {...baseProps} />);
    expect(getByText("cancel")).toBeTruthy();
  });

  it("icône 'car' présente", async () => {
    const { getByTestId } = await render(<SearchingDriverModal {...baseProps} />);
    expect(getByTestId("icon-car")).toBeTruthy();
  });

  it("pas de bouton 'retry_search' en mode recherche", async () => {
    const { queryByText } = await render(<SearchingDriverModal {...baseProps} />);
    expect(queryByText("retry_search")).toBeNull();
  });
});

// ─── mode aucun chauffeur ─────────────────────────────────────────────────────

describe("SearchingDriverModal — mode aucun chauffeur (noDriverFound=true)", () => {
  const noDriverProps = { ...baseProps, noDriverFound: true };

  it("affiche 'no_driver_found'", async () => {
    const { getByText } = await render(<SearchingDriverModal {...noDriverProps} />);
    expect(getByText("no_driver_found")).toBeTruthy();
  });

  it("affiche 'no_driver_message'", async () => {
    const { getByText } = await render(<SearchingDriverModal {...noDriverProps} />);
    expect(getByText("no_driver_message")).toBeTruthy();
  });

  it("affiche bouton 'retry_search'", async () => {
    const { getByText } = await render(<SearchingDriverModal {...noDriverProps} />);
    expect(getByText("retry_search")).toBeTruthy();
  });

  it("icône 'car-off' présente", async () => {
    const { getByTestId } = await render(<SearchingDriverModal {...noDriverProps} />);
    expect(getByTestId("icon-car-off")).toBeTruthy();
  });

  it("pas de countdown affiché en mode no-driver", async () => {
    const { queryByText } = await render(<SearchingDriverModal {...noDriverProps} />);
    expect(queryByText("02:00")).toBeNull();
  });
});

// ─── callbacks ────────────────────────────────────────────────────────────────

describe("SearchingDriverModal — callbacks", () => {
  it("appui cancel → onCancel", async () => {
    const onCancel = jest.fn();
    const { getByText } = await render(
      <SearchingDriverModal {...baseProps} onCancel={onCancel} />
    );
    fireEvent.press(getByText("cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("mode noDriverFound — appui retry → onRetry", async () => {
    const onRetry = jest.fn();
    const { getByText } = await render(
      <SearchingDriverModal {...baseProps} noDriverFound={true} onRetry={onRetry} />
    );
    fireEvent.press(getByText("retry_search"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
