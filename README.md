# Multi-Group Golf Tee Time Event Manager

## Overview
A production-ready web application for managing multiple independent golf groups, tee time events, and teams. Built with Node.js, Express, MongoDB (Mongoose), and a zero-build HTML/CSS/vanilla JS SPA frontend.

## Features
- Multiple groups, each with their own members, events, and admins
- Site-wide admin dashboard
- Group-level admin management
- Tee time and team event support
- RESTful JSON APIs
- Data isolation per group

## Tech Stack
- Backend: Node.js, Express, Mongoose
- Database: MongoDB
- Frontend: Static HTML/CSS/JS (no build tools)

## Setup
1. `npm install` in `/server`
2. Set up `.env` with your MongoDB URI and admin code
3. `node server/index.js` to start the backend
4. Visit `http://localhost:3000/` in your browser

## Directory Structure
- `/server` — Express backend, Mongoose models, API routes
- `/public` — Static frontend (HTML, CSS, JS)

## To Do
- Implement event signup, tee time/team management, notifications, and more
