import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CabSy",
    short_name: "CabSy",
    description: "Cabs are better shared - College Ride Sharing Portal",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0A0A",
    theme_color: "#F2CA50",
    icons: [
      {
        src: "/logo-circle.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
