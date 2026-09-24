import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import PromoCodeModal from "../PromoCodeModal";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@/constants/Colors", () => ({
  Colors: { light: { tint: "#6D56F2" } },
}));

const defaultProps = {
  visible: true,
  code: "",
  onChangeCode: jest.fn(),
  onValidate: jest.fn(),
  onIgnore: jest.fn(),
  onClose: jest.fn(),
  isEstimating: false,
};

beforeEach(() => jest.clearAllMocks());

// ─── visibilité ───────────────────────────────────────────────────────────────

describe("PromoCodeModal — visibilité", () => {
  it("affiche le contenu quand visible=true", async () => {
    const { getByText } = await render(<PromoCodeModal {...defaultProps} />);
    expect(getByText("enter_promo_code")).toBeTruthy();
  });

  it("n'affiche pas le contenu quand visible=false", async () => {
    const { queryByText } = await render(
      <PromoCodeModal {...defaultProps} visible={false} />
    );
    expect(queryByText("enter_promo_code")).toBeNull();
  });
});

// ─── contenu ─────────────────────────────────────────────────────────────────

describe("PromoCodeModal — contenu", () => {
  it("affiche le titre 'enter_promo_code'", async () => {
    const { getAllByText } = await render(<PromoCodeModal {...defaultProps} />);
    expect(getAllByText("enter_promo_code").length).toBeGreaterThanOrEqual(1);
  });

  it("affiche le bouton 'validate' quand isEstimating=false", async () => {
    const { getByText } = await render(<PromoCodeModal {...defaultProps} />);
    expect(getByText("validate")).toBeTruthy();
  });

  it("affiche 'loading' à la place de 'validate' quand isEstimating=true", async () => {
    const { getByText, queryByText } = await render(
      <PromoCodeModal {...defaultProps} isEstimating={true} />
    );
    expect(getByText("loading")).toBeTruthy();
    expect(queryByText("validate")).toBeNull();
  });

  it("affiche le bouton 'ignore'", async () => {
    const { getByText } = await render(<PromoCodeModal {...defaultProps} />);
    expect(getByText("ignore")).toBeTruthy();
  });

  it("affiche le code courant dans le champ", async () => {
    const { getByDisplayValue } = await render(
      <PromoCodeModal {...defaultProps} code="PROMO20" />
    );
    expect(getByDisplayValue("PROMO20")).toBeTruthy();
  });
});

// ─── callbacks ────────────────────────────────────────────────────────────────

describe("PromoCodeModal — callbacks", () => {
  it("appui 'validate' → onValidate appelé", async () => {
    const onValidate = jest.fn();
    const { getByText } = await render(
      <PromoCodeModal {...defaultProps} onValidate={onValidate} />
    );
    fireEvent.press(getByText("validate"));
    expect(onValidate).toHaveBeenCalledTimes(1);
  });

  it("appui 'ignore' → onIgnore appelé", async () => {
    const onIgnore = jest.fn();
    const { getByText } = await render(
      <PromoCodeModal {...defaultProps} onIgnore={onIgnore} />
    );
    fireEvent.press(getByText("ignore"));
    expect(onIgnore).toHaveBeenCalledTimes(1);
  });

  it("boutons désactivés quand isEstimating=true", async () => {
    const onValidate = jest.fn();
    const { getByText } = await render(
      <PromoCodeModal {...defaultProps} isEstimating={true} onValidate={onValidate} />
    );
    fireEvent.press(getByText("loading"));
    expect(onValidate).not.toHaveBeenCalled();
  });

  it("saisie dans le champ → onChangeCode appelé", async () => {
    const onChangeCode = jest.fn();
    const { getByDisplayValue } = await render(
      <PromoCodeModal {...defaultProps} code="AB" onChangeCode={onChangeCode} />
    );
    fireEvent.changeText(getByDisplayValue("AB"), "ABC");
    expect(onChangeCode).toHaveBeenCalled();
  });
});
