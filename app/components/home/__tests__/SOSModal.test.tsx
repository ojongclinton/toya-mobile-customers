import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import SOSModal from "../SOSModal";

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

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  onCallPolice: jest.fn(),
  onCallGendarmerie: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

// ─── visibilité ───────────────────────────────────────────────────────────────

describe("SOSModal — visibilité", () => {
  it("affiche le contenu quand visible=true", async () => {
    const { getByText } = await render(<SOSModal {...defaultProps} />);
    expect(getByText("emergency")).toBeTruthy();
  });

  it("n'affiche pas le contenu quand visible=false", async () => {
    const { queryByText } = await render(
      <SOSModal {...defaultProps} visible={false} />
    );
    expect(queryByText("emergency")).toBeNull();
  });
});

// ─── contenu ─────────────────────────────────────────────────────────────────

describe("SOSModal — contenu", () => {
  it("affiche le titre 'emergency'", async () => {
    const { getByText } = await render(<SOSModal {...defaultProps} />);
    expect(getByText("emergency")).toBeTruthy();
  });

  it("affiche le sous-titre 'select_emergency_service'", async () => {
    const { getByText } = await render(<SOSModal {...defaultProps} />);
    expect(getByText("select_emergency_service")).toBeTruthy();
  });

  it("affiche le bouton Police", async () => {
    const { getByText } = await render(<SOSModal {...defaultProps} />);
    expect(getByText("call_police")).toBeTruthy();
  });

  it("affiche le bouton Gendarmerie", async () => {
    const { getByText } = await render(<SOSModal {...defaultProps} />);
    expect(getByText("call_gendarmerie")).toBeTruthy();
  });

  it("affiche le bouton Annuler", async () => {
    const { getByText } = await render(<SOSModal {...defaultProps} />);
    expect(getByText("cancel")).toBeTruthy();
  });

  it("icône alert-octagon présente", async () => {
    const { getByTestId } = await render(<SOSModal {...defaultProps} />);
    expect(getByTestId("icon-alert-octagon")).toBeTruthy();
  });
});

// ─── callbacks ────────────────────────────────────────────────────────────────

describe("SOSModal — callbacks", () => {
  it("appui Police → onCallPolice appelé", async () => {
    const onCallPolice = jest.fn();
    const { getByText } = await render(
      <SOSModal {...defaultProps} onCallPolice={onCallPolice} />
    );
    fireEvent.press(getByText("call_police"));
    expect(onCallPolice).toHaveBeenCalledTimes(1);
  });

  it("appui Gendarmerie → onCallGendarmerie appelé", async () => {
    const onCallGendarmerie = jest.fn();
    const { getByText } = await render(
      <SOSModal {...defaultProps} onCallGendarmerie={onCallGendarmerie} />
    );
    fireEvent.press(getByText("call_gendarmerie"));
    expect(onCallGendarmerie).toHaveBeenCalledTimes(1);
  });

  it("appui Annuler → onClose appelé", async () => {
    const onClose = jest.fn();
    const { getByText } = await render(
      <SOSModal {...defaultProps} onClose={onClose} />
    );
    fireEvent.press(getByText("cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
