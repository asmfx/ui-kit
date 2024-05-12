import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

export interface IPortalProps {
  children: React.ReactNode;
  refNode?: HTMLElement;
}

export const Portal: React.FC<IPortalProps> = (props) => {
  const { children, refNode } = props;
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <>
      {isClient &&
        ReactDOM.createPortal(children as any, refNode || document.body)}
    </>
  );
};
