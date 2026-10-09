import React from "react";
import { sans, serif } from "./fonts";

/**
 * Minimal maths typesetting.
 *
 * Variables are oblique, operators and digits upright, subscripts are real
 * subscripts. That is enough to make a coordinate read as maths rather than as
 * a string of characters.
 */

type MProps = {
  readonly children: React.ReactNode;
  readonly size?: number;
  readonly color?: string;
  readonly style?: React.CSSProperties;
};

export const M: React.FC<MProps> = ({ children, size = 34, color, style }) => (
  <span
    style={{
      fontFamily: serif,
      fontSize: size,
      color,
      lineHeight: 1.5,
      fontVariantNumeric: "lining-nums tabular-nums",
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </span>
);

/** A maths variable. */
export const Vv: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <i style={{ fontStyle: "italic" }}>{children}</i>
);

/** A point or segment NAME — upright, like a label, never like a scalar. */
export const Nm: React.FC<{ children?: React.ReactNode; sub?: string; color?: string }> = ({
  children,
  sub,
  color,
}) => (
  <span
    style={{
      fontStyle: "normal",
      letterSpacing: "0.04em",
      color,
      fontWeight: 600,
    }}
  >
    {children}
    {sub ? <sub style={{ fontSize: "0.62em" }}>{sub}</sub> : null}
  </span>
);

/** A point or segment names such as B₁, AD₁ — italic, with a subscript. */
export const Pt: React.FC<{ children?: React.ReactNode; sub?: string }> = ({
  children,
  sub,
}) => (
  <i style={{ fontStyle: "italic" }}>
    {children}
    {sub ? <sub style={{ fontSize: "0.62em" }}>{sub}</sub> : null}
  </i>
);

/** A vector over-arrow: renders the symbol, italic. */
export const Vec: React.FC<{ children?: React.ReactNode; sub?: string }> = ({
  children,
  sub,
}) => (
  <span style={{ position: "relative", display: "inline-block", paddingTop: "0.16em" }}>
    <span
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: "-0.28em",
        fontSize: "0.8em",
        lineHeight: 1,
        textAlign: "center",
      }}
    >
      ⇀
    </span>
    <i style={{ fontStyle: "italic" }}>
      {children}
      {sub ? <sub style={{ fontSize: "0.62em" }}>{sub}</sub> : null}
    </i>
  </span>
);

/** A tuple, drawn with generous commas. */
export const Tup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span>
    ( <span style={{ display: "inline-block" }}>{children}</span> )
  </span>
);

export const s = sans;
export const sf = serif;
