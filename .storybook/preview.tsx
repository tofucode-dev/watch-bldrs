import type { Preview } from "@storybook/react-vite";

import "../src/styles/global.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "centered",
    a11y: {
      test: "todo",
    },
  },
  globalTypes: {
    theme: {
      description: "Paper (light) or ink (dark) tokens from global.css",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Paper" },
          { value: "dark", title: "Ink" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "light",
  },
  decorators: [
    (Story, context) => {
      const isDark = context.globals.theme === "dark";

      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", isDark);
      }

      return <Story />;
    },
  ],
};

export default preview;
