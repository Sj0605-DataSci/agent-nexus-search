// Mock Chrome API for testing
const chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  runtime: {
    sendMessage: jest.fn()
  }
};

global.chrome = chrome;

// Import functions to test
const { fetchVoyagerProfile } = require('./background');

describe('Voyager Profile Fetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should fetch profile with valid JSESSIONID', async () => {
    // Mock successful response
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ included: [{
          firstName: 'Test',
          lastName: 'User',
          profilePicture: {
            displayImage: {
              elements: [{
                identifiers: [{ identifier: 'test.jpg' }]
              }]
            }
          }
        }]})
      })
    );

    chrome.storage.local.get.mockResolvedValue({ JSESSIONID_TOKEN: 'test-token' });
    
    const profile = await fetchVoyagerProfile();
    expect(profile.included[0].firstName).toBe('Test');
    expect(fetch).toHaveBeenCalledWith(
      'https://www.linkedin.com/voyager/api/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          'csrf-token': 'test-token'
        })
      })
    );
  });

  test('should handle fetch errors', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 401 })
    );
    
    await expect(fetchVoyagerProfile()).rejects.toThrow('HTTP error! Status: 401');
  });
});
