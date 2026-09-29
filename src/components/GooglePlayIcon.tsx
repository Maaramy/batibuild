/**
 * Icône Google Play (vectorielle, quelques centaines d'octets, aucun réseau).
 *
 * Partagée par les bannières de téléchargement de l'application Android
 * (`AppDownloadFooterBanner`) : une seule définition, aucune duplication d'assets.
 */
export function GooglePlayIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        fill="#00A0FF"
        d="M47.9 24.6C42.4 30.4 39.5 39 39.5 50v412c0 11 2.9 19.6 8.4 25.4l1.6 1.5 230.8-230.8v-5.4L49.5 23.1l-1.6 1.5Z"
      />
      <path
        fill="#FFDA44"
        d="m361.2 341.1-76.9-76.9v-5.4l77-76.9 1.7 1 91.1 51.8c26 14.8 26 39 0 53.8l-91.1 51.8-1.8.2Z"
      />
      <path
        fill="#FF3A44"
        d="M363 340.2 284.3 261.5 48 499.4c8.6 9.1 22.7 10.2 38.6 1.2L363 340.2Z"
      />
      <path
        fill="#2ECB70"
        d="M363 184.4 86.6 24C70.7 14.9 56.6 16.1 48 25.1l236.3 236.3 78.7-77Z"
      />
    </svg>
  );
}

export default GooglePlayIcon;
