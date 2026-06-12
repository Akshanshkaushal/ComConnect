import React, { useCallback, useEffect, useRef, useState } from "react";
import { FiArrowLeft, FiMapPin } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import { ChatState } from "../../Context/ChatProvider";
import socket from "../../Context/SocketContext";
import MapComponent from "./Map";
import "./geolocation.css";

const normalizeUsers = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") return Object.values(payload);
  return [];
};

const Geo = () => {
  const { user } = ChatState();
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [location, setLocation] = useState(null);
  const [otherUsers, setOtherUsers] = useState(new Map());
  const [connectionStatus, setConnectionStatus] = useState(
    socket.connected ? "connected" : "connecting"
  );
  const [isSharing, setIsSharing] = useState(false);
  const [locationError, setLocationError] = useState("");
  const watchIdRef = useRef(null);

  const publishLocation = useCallback(
    (position) => {
      if (!user?._id) return;

      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        userId: user._id,
        userName: user.name,
        userPic: user.pic,
        workspaceId,
        timestamp: Date.now(),
      };

      setLocation(locationData);
      setLocationError("");
      if (socket.connected) socket.emit("location-update", locationData);
    },
    [user, workspaceId]
  );

  const stopSharing = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsSharing(false);
    if (socket.connected) {
      socket.emit("location-sharing-stopped", {
        userId: user?._id,
        workspaceId,
      });
    }
  }, [user?._id, workspaceId]);

  const startSharing = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Location is not supported by this browser.");
      return;
    }

    setLocationError("");
    watchIdRef.current = navigator.geolocation.watchPosition(
      publishLocation,
      (error) => {
        setIsSharing(false);
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Enable it in your browser settings."
            : "Your location could not be determined. Please try again."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );
    setIsSharing(true);
  }, [publishLocation]);

  useEffect(() => {
    if (!user?.token) return undefined;

    socket.auth = { token: user.token };
    if (!socket.connected) socket.connect();

    const joinMap = () => {
      setConnectionStatus("connected");
      socket.emit("setup");
      socket.emit("join-location-workspace", { workspaceId });
    };
    const handleDisconnect = () => setConnectionStatus("disconnected");
    const handleLocations = (payload) => {
      const users = normalizeUsers(payload).filter((member) => {
        if (!member?.userId || member.userId === user._id) return false;
        return !member.workspaceId || !workspaceId || member.workspaceId === workspaceId;
      });
      setOtherUsers(new Map(users.map((member) => [member.userId, member])));
    };
    const handleLocation = (member) => {
      if (
        !member?.userId ||
        member.userId === user._id ||
        (member.workspaceId && workspaceId && member.workspaceId !== workspaceId)
      ) {
        return;
      }
      setOtherUsers((current) => {
        const next = new Map(current);
        next.set(member.userId, member);
        return next;
      });
    };
    const removeLocation = ({ userId }) => {
      setOtherUsers((current) => {
        const next = new Map(current);
        next.delete(userId);
        return next;
      });
    };
    const handleLocationError = ({ message }) => {
      setLocationError(message || "Workspace location sharing is unavailable.");
    };

    socket.on("connect", joinMap);
    socket.on("disconnect", handleDisconnect);
    socket.on("other-users-location", handleLocations);
    socket.on("user-location-updated", handleLocation);
    socket.on("user-location-removed", removeLocation);
    socket.on("location-error", handleLocationError);
    if (socket.connected) joinMap();

    return () => {
      stopSharing();
      socket.emit("leave-location-workspace", { workspaceId });
      socket.off("connect", joinMap);
      socket.off("disconnect", handleDisconnect);
      socket.off("other-users-location", handleLocations);
      socket.off("user-location-updated", handleLocation);
      socket.off("user-location-removed", removeLocation);
      socket.off("location-error", handleLocationError);
    };
  }, [stopSharing, user?._id, user?.token, workspaceId]);

  if (!user) return null;

  return (
    <main className="location-page">
      <section className="location-panel" aria-label="Workspace live map controls">
        <div className="location-panel__header">
          <button
            type="button"
            className="location-back"
            aria-label="Back to workspace"
            onClick={() =>
              navigate(workspaceId ? `/workspace/${workspaceId}/chats` : "/workspace")
            }
          >
            <FiArrowLeft />
          </button>
          <FiMapPin color="#34d399" size={24} />
          <div className="location-panel__title">
            <h1>Workspace live map</h1>
            <p>{otherUsers.size + (location ? 1 : 0)} sharing location now</p>
          </div>
        </div>

        <div className="location-status">
          <span
            className={`location-status__dot ${
              connectionStatus === "connected"
                ? "location-status__dot--connected"
                : ""
            }`}
          />
          {connectionStatus === "connected" ? "Live updates connected" : "Reconnecting"}
          {location?.accuracy
            ? ` - accuracy ${Math.round(location.accuracy)} m`
            : ""}
        </div>

        <button
          type="button"
          className={`location-share ${isSharing ? "location-share--stop" : ""}`}
          onClick={isSharing ? stopSharing : startSharing}
        >
          {isSharing ? "Stop sharing my location" : "Share my live location"}
        </button>
        <p className="location-note">
          Only people currently sharing appear on this workspace map. Sharing stops
          when you leave this page.
        </p>
        {locationError && <p className="location-error">{locationError}</p>}
      </section>

      <MapComponent
        location={location}
        otherUsers={Array.from(otherUsers.values())}
      />
    </main>
  );
};

export default Geo;
