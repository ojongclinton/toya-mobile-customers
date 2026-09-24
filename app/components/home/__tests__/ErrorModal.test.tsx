import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import ErrorModal from "../ErrorModal";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const defaultProps = {
  visible: true,
  message: "Une erreur est survenue",
  onClose: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

// ─── visibilité ───────────────────────────────────────────────────────────────

describe("ErrorModal — visibilité", () => {
  it("affiche le message quand visible=true", async () => {
    const { getByText } = await render(<ErrorModal {...defaultProps} />);
    expect(getByText("Une erreur est survenue")).toBeTruthy();
  });

  it("n'affiche pas le contenu quand visible=false", async () => {
    const { queryByText } = await render(
      <ErrorModal {...defaultProps} visible={false} />
    );
    expect(queryByText("Une erreur est survenue")).toBeNull();
  });
});

// ─── contenu ─────────────────────────────────────────────────────────────────

describe("ErrorModal — contenu", () => {
  it("affiche le bouton fermer (clé 'close')", async () => {
    const { getByText } = await render(<ErrorModal {...defaultProps} />);
    expect(getByText("close")).toBeTruthy();
  });

  it("message long affiché complètement", async () => {
    const longMsg = "Erreur critique : connexion au serveur impossible. Veuillez réessayer.";
    const { getByText } = await render(
      <ErrorModal {...defaultProps} message={longMsg} />
    );
    expect(getByText(longMsg)).toBeTruthy();
  });

  it("message vide → pas de crash", async () => {
    await expect(
      render(<ErrorModal {...defaultProps} message="" />)
    ).resolves.toBeDefined();
  });
});

// ─── callbacks ────────────────────────────────────────────────────────────────

describe("ErrorModal — callbacks", () => {
  it("appui bouton close → onClose appelé", async () => {
    const onClose = jest.fn();
    const { getByText } = await render(
      <ErrorModal {...defaultProps} onClose={onClose} />
    );
    fireEvent.press(getByText("close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ─── snapshot ────────────────────────────────────────────────────────────────

describe("ErrorModal — snapshot", () => {
  it("snapshot visible=true", async () => {
    const { toJSON } = await render(<ErrorModal {...defaultProps} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
