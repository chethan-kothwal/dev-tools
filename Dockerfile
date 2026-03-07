FROM nginx:1.27-alpine

# Replace default site config with a minimal static-site config.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Serve the app.
COPY index.html styles.css app.js /usr/share/nginx/html/

EXPOSE 80

# Keep nginx in the foreground.
CMD ["nginx", "-g", "daemon off;"]
