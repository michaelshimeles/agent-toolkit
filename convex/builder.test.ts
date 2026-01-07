/**
 * Tests for External API Key Management Logic
 */

import { describe, it, expect } from "vitest";

describe("External API Key Management", () => {
  describe("External API Key Data Model", () => {
    it("should have required fields", () => {
      const apiKey = {
        userId: "user_123" as any,
        serverId: "server_456" as any,
        serviceName: "OpenWeatherMap",
        serviceKey: "sk-abc123",
        keyName: "My Weather Key",
        createdAt: Date.now(),
        _id: "key_789" as any,
      };

      expect(apiKey.userId).toBeTruthy();
      expect(apiKey.serverId).toBeTruthy();
      expect(apiKey.serviceName).toBeTruthy();
      expect(apiKey.serviceKey).toBeTruthy();
      expect(apiKey.keyName).toBeTruthy();
    });

    it("should support optional lastUsed field", () => {
      const apiKey = {
        userId: "user_123" as any,
        serverId: "server_456" as any,
        serviceName: "OpenWeatherMap",
        serviceKey: "sk-abc123",
        keyName: "My Key",
        createdAt: Date.now(),
        lastUsed: undefined as number | undefined,
      };

      expect(apiKey.lastUsed).toBeUndefined();

      // Simulate usage update
      apiKey.lastUsed = Date.now();
      expect(apiKey.lastUsed).toBeDefined();
      expect(apiKey.lastUsed).toBeGreaterThan(0);
    });
  });

  describe("storeExternalApiKey Logic", () => {
    it("should store a new API key", () => {
      const keys: any[] = [];

      const storeKey = (args: {
        userId: string;
        serverId: string;
        serviceName: string;
        serviceKey: string;
        keyName: string;
      }) => {
        const existingKey = keys.find(
          (k) => k.userId === args.userId && k.serviceName === args.serviceName
        );

        if (existingKey) {
          existingKey.serviceKey = args.serviceKey;
          existingKey.keyName = args.keyName;
          existingKey.lastUsed = Date.now();
          return existingKey._id;
        }

        const newKey = {
          ...args,
          _id: `key_${keys.length + 1}`,
          createdAt: Date.now(),
        };
        keys.push(newKey);
        return newKey._id;
      };

      const result = storeKey({
        userId: "user_123",
        serverId: "server_456",
        serviceName: "OpenWeatherMap",
        serviceKey: "test-api-key-123",
        keyName: "My Weather Key",
      });

      expect(result).toBeDefined();
      expect(keys).toHaveLength(1);
      expect(keys[0].serviceName).toBe("OpenWeatherMap");
    });

    it("should update an existing API key", () => {
      const keys: any[] = [
        {
          _id: "key_1",
          userId: "user_123",
          serverId: "server_456",
          serviceName: "OpenWeatherMap",
          serviceKey: "initial-key",
          keyName: "Initial Key",
          createdAt: Date.now(),
        },
      ];

      const storeKey = (args: {
        userId: string;
        serverId: string;
        serviceName: string;
        serviceKey: string;
        keyName: string;
      }) => {
        const existingKey = keys.find(
          (k) => k.userId === args.userId && k.serviceName === args.serviceName
        );

        if (existingKey) {
          existingKey.serviceKey = args.serviceKey;
          existingKey.keyName = args.keyName;
          existingKey.lastUsed = Date.now();
          return existingKey._id;
        }

        const newKey = {
          ...args,
          _id: `key_${keys.length + 1}`,
          createdAt: Date.now(),
        };
        keys.push(newKey);
        return newKey._id;
      };

      // Update existing key
      const result = storeKey({
        userId: "user_123",
        serverId: "server_456",
        serviceName: "OpenWeatherMap",
        serviceKey: "updated-key",
        keyName: "Updated Key",
      });

      expect(result).toBe("key_1"); // Same ID returned
      expect(keys).toHaveLength(1); // No new key added
      expect(keys[0].serviceKey).toBe("updated-key");
      expect(keys[0].keyName).toBe("Updated Key");
    });

    it("should allow different services for same user", () => {
      const keys: any[] = [];

      const storeKey = (args: {
        userId: string;
        serverId: string;
        serviceName: string;
        serviceKey: string;
        keyName: string;
      }) => {
        const existingKey = keys.find(
          (k) => k.userId === args.userId && k.serviceName === args.serviceName
        );

        if (existingKey) {
          existingKey.serviceKey = args.serviceKey;
          existingKey.keyName = args.keyName;
          return existingKey._id;
        }

        const newKey = {
          ...args,
          _id: `key_${keys.length + 1}`,
          createdAt: Date.now(),
        };
        keys.push(newKey);
        return newKey._id;
      };

      const key1 = storeKey({
        userId: "user_123",
        serverId: "server_456",
        serviceName: "OpenWeatherMap",
        serviceKey: "weather-key",
        keyName: "Weather Key",
      });

      const key2 = storeKey({
        userId: "user_123",
        serverId: "server_456",
        serviceName: "TwitterAPI",
        serviceKey: "twitter-key",
        keyName: "Twitter Key",
      });

      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
      expect(key1).not.toBe(key2);
      expect(keys).toHaveLength(2);
    });
  });

  describe("getExternalApiKey Logic", () => {
    it("should retrieve a stored API key", () => {
      const keys = [
        {
          _id: "key_1",
          userId: "user_123",
          serverId: "server_456",
          serviceName: "OpenWeatherMap",
          serviceKey: "test-key-123",
          keyName: "Test Key",
        },
      ];

      const getKey = (userId: string, serviceName: string) => {
        return (
          keys.find(
            (k) => k.userId === userId && k.serviceName === serviceName
          ) || null
        );
      };

      const retrieved = getKey("user_123", "OpenWeatherMap");

      expect(retrieved).toBeDefined();
      expect(retrieved?.serviceName).toBe("OpenWeatherMap");
      expect(retrieved?.serviceKey).toBe("test-key-123");
      expect(retrieved?.keyName).toBe("Test Key");
    });

    it("should return null for non-existent key", () => {
      const keys: any[] = [];

      const getKey = (userId: string, serviceName: string) => {
        return (
          keys.find(
            (k) => k.userId === userId && k.serviceName === serviceName
          ) || null
        );
      };

      const result = getKey("user_123", "NonExistentService");

      expect(result).toBeNull();
    });

    it("should not return keys from other users", () => {
      const keys = [
        {
          _id: "key_1",
          userId: "other_user",
          serverId: "server_456",
          serviceName: "OpenWeatherMap",
          serviceKey: "other-user-key",
          keyName: "Other User Key",
        },
      ];

      const getKey = (userId: string, serviceName: string) => {
        return (
          keys.find(
            (k) => k.userId === userId && k.serviceName === serviceName
          ) || null
        );
      };

      // Try to retrieve with different user
      const retrieved = getKey("user_123", "OpenWeatherMap");

      expect(retrieved).toBeNull();
    });
  });

  describe("listExternalApiKeys Logic", () => {
    it("should list all API keys for a user", () => {
      const keys = [
        {
          _id: "key_1",
          userId: "user_123",
          serviceName: "OpenWeatherMap",
          serviceKey: "weather-key",
          keyName: "Weather Key",
        },
        {
          _id: "key_2",
          userId: "user_123",
          serviceName: "TwitterAPI",
          serviceKey: "twitter-key",
          keyName: "Twitter Key",
        },
        {
          _id: "key_3",
          userId: "other_user",
          serviceName: "GitHubAPI",
          serviceKey: "github-key",
          keyName: "GitHub Key",
        },
      ];

      const listKeys = (userId: string) => {
        return keys.filter((k) => k.userId === userId);
      };

      const result = listKeys("user_123");

      expect(result).toHaveLength(2);
      expect(result.map((k) => k.serviceName)).toContain("OpenWeatherMap");
      expect(result.map((k) => k.serviceName)).toContain("TwitterAPI");
    });

    it("should return empty list for user with no keys", () => {
      const keys: any[] = [];

      const listKeys = (userId: string) => {
        return keys.filter((k) => k.userId === userId);
      };

      const result = listKeys("user_123");

      expect(result).toHaveLength(0);
    });
  });

  describe("deleteExternalApiKey Logic", () => {
    it("should delete an API key", () => {
      let keys = [
        {
          _id: "key_1",
          userId: "user_123",
          serviceName: "OpenWeatherMap",
          serviceKey: "test-key",
          keyName: "Test Key",
        },
        {
          _id: "key_2",
          userId: "user_123",
          serviceName: "TwitterAPI",
          serviceKey: "twitter-key",
          keyName: "Twitter Key",
        },
      ];

      const deleteKey = (keyId: string) => {
        keys = keys.filter((k) => k._id !== keyId);
      };

      const getKey = (userId: string, serviceName: string) => {
        return (
          keys.find(
            (k) => k.userId === userId && k.serviceName === serviceName
          ) || null
        );
      };

      // Verify key exists
      const beforeDelete = getKey("user_123", "OpenWeatherMap");
      expect(beforeDelete).toBeDefined();

      // Delete the key
      deleteKey("key_1");

      // Verify key is gone
      const afterDelete = getKey("user_123", "OpenWeatherMap");
      expect(afterDelete).toBeNull();
      expect(keys).toHaveLength(1);
    });
  });

  describe("Integration with AI Generation", () => {
    it("should handle OpenWeatherMap API key requirements", () => {
      const keys: any[] = [];

      const storeKey = (args: {
        userId: string;
        serverId: string;
        serviceName: string;
        serviceKey: string;
        keyName: string;
      }) => {
        const newKey = {
          ...args,
          _id: `key_${keys.length + 1}`,
          createdAt: Date.now(),
        };
        keys.push(newKey);
        return newKey._id;
      };

      const getKey = (userId: string, serviceName: string) => {
        return (
          keys.find(
            (k) => k.userId === userId && k.serviceName === serviceName
          ) || null
        );
      };

      // Simulate AI detection of external API key requirements
      const serverData = {
        userId: "user_123",
        serverId: "server_456",
        serviceName: "OpenWeatherMap",
        serviceUrl: "https://openweathermap.org/api",
        instructions:
          "1. Sign up at OpenWeatherMap\n2. Get your API key\n3. Configure here",
      };

      // Store the API key as would happen in the UI flow
      const keyId = storeKey({
        userId: serverData.userId,
        serverId: serverData.serverId,
        serviceName: serverData.serviceName,
        serviceKey: "test-openweather-key",
        keyName: "OpenWeatherMap Production",
      });

      expect(keyId).toBeDefined();

      // Verify retrieval works as it would during deployment
      const retrieved = getKey(serverData.userId, serverData.serviceName);

      expect(retrieved?.serviceKey).toBe("test-openweather-key");
      expect(retrieved?.serviceName).toBe("OpenWeatherMap");
    });

    it("should prepare environment variables for deployment", () => {
      const keys = [
        {
          _id: "key_1",
          userId: "user_123",
          serviceName: "OpenWeatherMap",
          serviceKey: "weather-api-key-123",
        },
        {
          _id: "key_2",
          userId: "user_123",
          serviceName: "StripeAPI",
          serviceKey: "sk_test_stripe_key",
        },
      ];

      const prepareEnvVars = (
        userId: string,
        requiredServices: string[]
      ): Record<string, string> => {
        const envVars: Record<string, string> = {};

        for (const serviceName of requiredServices) {
          const key = keys.find(
            (k) => k.userId === userId && k.serviceName === serviceName
          );
          if (key) {
            // Store API keys as JSON for deployment
            const envKey = serviceName.toUpperCase().replace(/API$/, "") + "_API_KEY";
            envVars[envKey] = key.serviceKey;
          }
        }

        return envVars;
      };

      const envVars = prepareEnvVars("user_123", ["OpenWeatherMap", "StripeAPI"]);

      expect(envVars.OPENWEATHERMAP_API_KEY).toBe("weather-api-key-123");
      expect(envVars.STRIPE_API_KEY).toBe("sk_test_stripe_key");
    });
  });

  describe("Service Name Validation", () => {
    it("should accept common service names", () => {
      const validServiceNames = [
        "OpenWeatherMap",
        "TwitterAPI",
        "GitHubAPI",
        "StripeAPI",
        "SendGridAPI",
        "TwilioAPI",
      ];

      const isValidServiceName = (name: string) => {
        return name.length > 0 && name.length <= 100;
      };

      for (const name of validServiceNames) {
        expect(isValidServiceName(name)).toBe(true);
      }
    });

    it("should reject empty service names", () => {
      const isValidServiceName = (name: string) => {
        return name.length > 0 && name.length <= 100;
      };

      expect(isValidServiceName("")).toBe(false);
    });
  });

  describe("API Key Security", () => {
    it("should not expose full keys in list response", () => {
      const keys = [
        {
          _id: "key_1",
          userId: "user_123",
          serviceName: "OpenWeatherMap",
          serviceKey: "sk_live_very_secret_key_12345",
          keyName: "Production Key",
        },
      ];

      const listKeysWithMasking = (userId: string) => {
        return keys
          .filter((k) => k.userId === userId)
          .map((k) => ({
            ...k,
            serviceKey: k.serviceKey.slice(0, 8) + "..." + k.serviceKey.slice(-4),
          }));
      };

      const result = listKeysWithMasking("user_123");

      expect(result[0].serviceKey).toBe("sk_live_...2345");
      expect(result[0].serviceKey).not.toBe("sk_live_very_secret_key_12345");
    });

    it("should track when keys were last used", () => {
      const key = {
        _id: "key_1",
        userId: "user_123",
        serviceName: "OpenWeatherMap",
        serviceKey: "test-key",
        createdAt: Date.now() - 86400000, // 1 day ago
        lastUsed: undefined as number | undefined,
      };

      const updateLastUsed = (keyObj: typeof key) => {
        keyObj.lastUsed = Date.now();
      };

      expect(key.lastUsed).toBeUndefined();

      updateLastUsed(key);

      expect(key.lastUsed).toBeDefined();
      expect(key.lastUsed! > key.createdAt).toBe(true);
    });
  });
});
