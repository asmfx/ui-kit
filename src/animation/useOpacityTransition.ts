import React, { useState } from "react";

export const useOpacityTransition = (props?: {
  initialState?: boolean;
  transitionDuration?: number;
}) => {
  const transitionDuration = props?.transitionDuration || 300;
  const [visible, setVisible] = useState(props?.initialState || false);
  const [style, setStyle] = useState<React.CSSProperties>({
    transitionTimingFunction: "ease-in-out",
    transitionProperty: "opacity",
    transitionDuration: `${transitionDuration}ms`,
    opacity: props?.initialState ? 1 : 0,
  });

  const setOpacity = (opacity: number) => {
    setStyle({
      ...style,
      opacity,
    });
  };

  const enter = () => {
    setVisible(true);
    setTimeout(() => setOpacity(1), 50);
  };

  const exit = () => {
    setOpacity(0);
    setTimeout(() => {
      setVisible(false);
    }, transitionDuration);
  };

  const setState = (state?: boolean) => {
    if (state) {
      enter();
    } else {
      exit();
    }
  };

  return { visible, style, setState, enter, exit };
};
