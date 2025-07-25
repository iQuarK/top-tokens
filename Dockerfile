FROM node:20-alpine

# Crea y establece el directorio de trabajo
WORKDIR /app

# Copia los archivos del proyecto
COPY . .

# Instala las dependencias del proyecto
RUN npm install

# Expone el puerto para el servidor Node.js
EXPOSE 3000

# Comando para ejecutar la aplicación Node.js
CMD ["npm", "start"]
