const paths = {
  home: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  video: "M3 5h13v14H3ZM16 9l5-3v12l-5-3",
  chart: "M4 3v18h17M9 16v-5m5 5V7m5 9V4",
  folder: "M3 6h7l2 3h9v11H3ZM3 6V4h7l2 2h9v3",
  clips: "M4 3h16v18H4ZM4 8h16M4 16h16M9 3v5m6-5v5M9 16v5m6-5v5",
  export: "M12 16V3m-4 4 4-4 4 4M4 13v8h16v-8",
  settings: "M4 7h16M4 17h16M8 4v6m8 4v6",
  search: "M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  plus: "M12 4v16M4 12h16",
  close: "m5 5 14 14M5 19 19 5",
  check: "m4 12 5 5L20 6",
  undo: "m8 4-5 5 5 5M3 9h11a7 7 0 0 1 0 14",
  redo: "m16 4 5 5-5 5M21 9h-11a7 7 0 0 0 0 14",
  play: "m8 4 13 8-13 8Z",
  pause: "M8 4v16M16 4v16",
  clock: "M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  help: "M9 8a3 3 0 1 1 4 3c-1 .5-1 1-1 3m0 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  shield: "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z",
  court: "M3 3h18v18H3ZM8 3v6h8V3M8 9a4 4 0 0 0 8 0M3 7a9 9 0 0 0 18 0",
  volume: "M4 9h4l5-4v14l-5-4H4Zm13-2a7 7 0 0 1 0 10",
};
export function Icon({ name, size = 20, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.court} />
    </svg>
  );
}
