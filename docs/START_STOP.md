# Starting and Stopping Server & Client

## 🚀 Starting the Services

### Start Server (Terminal 1)
```bash
cd server
npm run dev
```
Server runs on: **http://localhost:3000**

### Start Client (Terminal 2)
```bash
cd client
npm run dev
```
Client runs on: **http://localhost:5173** (or next available port)

---

## 🛑 Stopping the Services

### Method 1: Graceful Stop (Recommended)
In each terminal window, press:
```
Ctrl + C
```
Press it **twice** if needed to force stop.

### Method 2: Force Kill by Port (If Ctrl+C doesn't work)

#### Kill Server (port 3000)
```bash
lsof -ti :3000 | xargs kill -9
```

#### Kill Client (port 5173)
```bash
lsof -ti :5173 | xargs kill -9
```

### Method 3: Force Kill All Node Processes (Nuclear Option)
⚠️ **WARNING**: This kills ALL Node.js processes on your system!

```bash
# Find all node processes related to muzbeats
ps aux | grep -E "(tsx watch|vite|npm run dev)" | grep muzbeats | grep -v grep

# Kill all node processes (be careful!)
pkill -9 -f "tsx watch"
pkill -9 -f "vite"
pkill -9 -f "npm run dev"
```

### Method 4: Kill by Process ID
```bash
# Find process IDs
ps aux | grep -E "(tsx watch|vite)" | grep -v grep

# Kill specific PIDs (replace with actual PIDs)
kill -9 <PID>
```

---

## 🔍 Checking if Services are Running

### Check Server
```bash
lsof -i :3000
# OR
curl http://localhost:3000/health
```

### Check Client
```bash
lsof -i :5173
```

### Check Both
```bash
lsof -i :3000 -i :5173
```

---

## 📝 Quick Reference Commands

### Start Both (in separate terminals)
```bash
# Terminal 1
cd server && npm run dev

# Terminal 2  
cd client && npm run dev
```

### Kill Both
```bash
# Kill server
lsof -ti :3000 | xargs kill -9

# Kill client
lsof -ti :5173 | xargs kill -9
```

### Kill Both at Once
```bash
lsof -ti :3000 :5173 | xargs kill -9
```

---

## ⚠️ Important Notes

1. **Server processes can be persistent** - If `Ctrl+C` doesn't work, use `kill -9` by port
2. **Always check if processes are actually stopped** using `lsof -i :3000` or `lsof -i :5173`
3. **Don't let processes run for hours** - They should be stopped when not in use
4. **If ports are still in use after killing**, wait a few seconds and try again (ports may take a moment to release)

