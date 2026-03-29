# 1. Use a Node.js "Construction Set" (Requirement 5)
FROM node:18

# 2. Create the "Workspace" where we build the app
WORKDIR /app

# 3. Copy the "Shopping List" of tools (Requirement 89)
COPY package*.json ./

# 4. Download and install all the tools (like React and Axios)
RUN npm install

# 5. Copy all your React code files into the container
COPY . .

# 6. Open a "Window" so we can see the app from our browser
EXPOSE 3000

# 7. Tell the computer to "Start the App"
CMD ["npm", "start"]