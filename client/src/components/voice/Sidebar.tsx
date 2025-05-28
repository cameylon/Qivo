import { Mic, Activity, Users, Settings, CheckCircle, AlertTriangle } from "lucide-react";

interface SidebarProps {
  isConnected: boolean;
  connectionStatus: string;
  metrics: any;
  sessionId: number | null;
}

export function Sidebar({ isConnected, connectionStatus, metrics, sessionId }: SidebarProps) {
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
            <Mic className="text-white text-lg h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">New Voice</h1>
            <p className="text-sm text-gray-500">Voice Processing Platform</p>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Connection Status</span>
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full animate-pulse-slow ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span
              className={`text-xs font-medium ${
                isConnected ? "text-green-600" : "text-red-600"
              }`}
            >
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {window.location.protocol === "https:" ? "wss://" : "ws://"}
          {window.location.host}/ws
        </div>
      </div>

      {/* System Health */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">System Health</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">WebSocket</span>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
              <span className={`text-xs ${isConnected ? "text-green-600" : "text-red-600"}`}>
                {isConnected ? "Online" : "Offline"}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Speech-to-Text</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-green-600">Ready</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Emotion Analysis</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-green-600">Active</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Speaker Recognition</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-green-600">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          <a
            href="#"
            className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-primary/10 text-primary font-medium"
          >
            <Mic className="w-4 h-4" />
            <span className="text-sm">Voice Processing</span>
          </a>
          <a
            href="#"
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Activity className="w-4 h-4" />
            <span className="text-sm">Analytics</span>
          </a>
          <a
            href="#"
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Users className="w-4 h-4" />
            <span className="text-sm">Speaker Profiles</span>
          </a>
          <a
            href="#"
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Settings</span>
          </a>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <span>API Health:</span>
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span className="text-green-600">Operational</span>
          </div>
          <div className="mt-1">
            Uptime: <span>{metrics ? formatUptime(metrics.uptime || 0) : "0h 0m"}</span>
          </div>
          {sessionId && (
            <div className="mt-1">
              Session: <span className="font-mono">#{sessionId}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
