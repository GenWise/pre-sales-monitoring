const { google } = require('googleapis');

// Service account key (Base64 encoded)
const SERVICE_ACCOUNT_KEY = `ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAic2hlZXRzLWFuZC1weXRob24tMzQwNzExIiwKICAicHJpdmF0ZV9rZXlfaWQiOiAiZWE3NzNlZWRjZGNjNDI5MmE5NzY3NDJmYzE1YWNiNDE5OWJiYzc5NyIsCiAgInByaXZhdGVfa2V5IjogIi0tLS0tQkVHSU4gUFJJVkFURSBLRVktLS0tLVxuTUlJRXZnSUJBREFOQmdrcWhraUc5dzBCQVFFRkFBU0NCS2d3Z2dTa0FnRUFBb0lCQVFERHIvSmNmQzVvSTNPUVxuSGpHVmJIblBOSlJEUFhqNE5UVkprM2xGb1g0ZVRmTHB2K1g4T01NYmpUYUptNHZJWHEyWmdRRUZtMVg1dk1QK1xuMVBNaUF3UkFMdXBzRW05YTZ5ZjZYcjFRRGczUjBxSDcrMmVTbXlzQ3hwdkg1S1BQK1JRMnBaTFV1QnJkNXpmRFxuNlhaN0E1NjZySlN0eWNTbXptL1VKU2FBeGppUFcrUk1VNzE3ZGtCQ3lUZG9KZE5sMHA1VUFzcjBzNXZoQVJNR1xuZWx2N0Q0bmNybTNKdVhOOHlSSTl1ZitXZGxMWmNjbk5IQVBIK1FYUnpKUitIWUkzZmVJM0ZydXU0bFdva2JZaVxuZXJoZS9zQ08yWDBPeGVSb1VvQW05V0h6R09nT1l3Yk9aQnRNV29zN3FkZk0rbkIyaFlCY1pqQVdxTUNZVUQ0VVxuV0xGS3ZxZGJBZ01CQUFFQ2dnRUJBTEI2K0F2eTNuTG9EZnZtQ21HMHEvUVVLMjdPTWtOYnFvb0ljWXBsVzUrN1xuZlVzSEd6aFNwekhFc1RFOHF0OWx0cWRoWW1PV0JGZXhWSkdCbGR6R3lGU0p1M2FlZ0MrUGcwUFlWaERseVR3VFxuOSsrN3JmeXB5Um5zZjZab2RoVGRsVzhsbVpscFU4K0QveE1lZ1NKbENnUUQrKzRzTVZhQ01rR1NkOFZuZUFKMlxucGppRWlDMjNsUE9qK0JrY2VQOGdlNTJHL3VTMmlGazJKZ0VGZVBETVJPUGRmL08xTU01cVhFYWlhTCtLeVozOVxuOXVZMFZqeTNjN29YL1dMYnFPMjlQSGhFa1kwVmpWRlRDcFhIdHpzN28wb05vcU80YXNQZnB4S2JSQXE1TmxMUlxubVNmSTNQNjMrc2NXNFJUYVg2UWZmS2hZSTZHSklnWDJrWUIyYUEwQ2dZRUEzWUNnOGt1ZTJYTFhiYmNVNnc0cVxuM2RUTHVGdjhvTGR1aGYyc0Z6NFdVWFZ5TWVMWTg4a2cvMUhJYVBjaHdKeFpGRWg5N3F1bGhGbXo1c3ZpbVJNUlxub21JdkNSb3hVclFvbWd2RVdKUU9vZmJ1aUVkZ3Znbi8yQWNkMDlPcnBNdURhVFJHWStRVWYwMHlOODEwSkQ5SFxueVhMQkVCZ3JqaE1oWjA5UVREQ25XTUV1Y3NDbUtnWUVBeHFSUWExcGdYRThJeTR1OGJrN25pNWVLZ2ZsVDFjSFxuWnhFN1hsODU2UXlQNE9tSERYaTAwVVlGN3dEWWdYWHN4dE1zeXJOQXJsbERZN01qMGZ5TlUzSm1GWk55eEEyTVxubXNLMDZzajJFSGlteWVWQWVuc0xJSGpMTWJZelVrNlRNcUcyMlJIZ2dITzJ0R0J0QnZOczB3VytFY3VGTENXQlxuVXNMWXRva0NnWUVBeEFBc1ZkR2FXV0YyVXNhTFI1NmpBRjMvSFN6T1NCa0Y1aStKd1NhOER2SkdkVkpGV3FwdFxuU3N2VnBnVVhVVFlYUlk1ZmVneDNWMTdCOXpJUGYzQUF1eXVNNFdtQmVaVGplQWpmQi9Zby9NVk5Yb3hOS3pPKVxuZURhMG9ybk5EbDNwRlp0ak0rY1R5L21meWNWRkJVYTdsbFJHU2tRZGVVWnVGMGJwZGVWUi9FQ2dZRUF2WGJJRlxudU1RKzNzVDJKeDQ1TGE4TjBLWDlBeGpURlRsWmJLNUFRSVRyUmE0UElIUFBOeC9JcEF4TjlOZ1pVSkpCeFY5ZlxuNUl1Z0M3UVovaDJmcDQ4cDlPRkFjSzM3MjlFZ0pVYktCNGxMWmlBS0g5ZUNaQnZOWG14ZldqQnNnMTNzTmFmTVxuL3R5WmJqS3UrdC9YZzNiQVdLUHozZCtqZCtMeGR3UzU5aGRSa3ZrcUpDYUJnUUNWZlZJOGhHMkN4SEhldUwrelxuSWZXeHIyZmllUjRLWTY5WUphT2NwSkZHdVBaUFJtblRKYXN3ZW1TYUp2QlAyMWJIQ2VRS1dSSE5WUVNXL0tMUFxucFBQaGh6OTBWQU5rOVY4SjBGMlBuRW9FT3Y4ams0M0M5Uy9TTUROY1Q4Y1lQTE8rb1ZOVVMyUmo1WUV1OThKWlxuNkhpZjRxaVQ2L1RJcFY5SkpSRG5yN2pQZlE9PVxuLS0tLS1FTkQgUFJJVkFURSBLRVktLS0tLVxuIiwKICAiY2xpZW50X2VtYWlsIjogInNoZWV0c3B5dGhvbkBzaGVldHMtYW5kLXB5dGhvbi0zNDA3MTEuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLAogICJjbGllbnRfaWQiOiAiMTA4NDg4NzUxNzk4NDgxMDE0MDU3IiwKICAiYXV0aF91cmkiOiAiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tL28vb2F1dGgyL2F1dGgiLAogICJ0b2tlbl91cmkiOiAiaHR0cHM6Ly9vYXV0aDIuZ29vZ2xlYXBpcy5jb20vdG9rZW4iLAogICJhdXRoX3Byb3ZpZGVyX3g1MDlfY2VydF91cmwiOiAiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vb2F1dGgyL3YxL2NlcnRzIiwKICAiY2xpZW50X3g1MDlfY2VydF91cmwiOiAiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vcm9ib3QvdjEvbWV0YWRhdGEveDUwOS9zaGVldHNweXRob24lNDBzaGVldHMtYW5kLXB5dGhvbi0zNDA3MTEuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLAogICJ1bml2ZXJzZV9kb21haW4iOiAiZ29vZ2xlYXBpcy5jb20iCn0=`;

const formSheets = {
  returning_students: {
    sheetId: '1qf9W8mKuWG6uSZbxEQPdCzY-SahraWD56U54w8QWvcc',
    gid: '740921898'
  },
  ats_qualifiers: {
    sheetId: '1GPJVwbqrbqGRDXo710PrXVC5nyHGPjhzQ40ZBOVvHmA',
    gid: '1220455786'
  },
  early_bird: {
    sheetId: '1HkzJOubGpBmnef2bSriwQlJ2dTQ8FqqLvYNhIPW4z4g',
    gid: '649065282'
  },
  website: {
    sheetId: '14Wj7yZSWq6J0Sbkh3yk26c24JCqvfekWJtGxYbjH-pE',
    gid: '1157652996'
  }
};

async function getFormHeaders() {
  try {
    // Decode and set up auth
    const serviceAccountKey = JSON.parse(Buffer.from(SERVICE_ACCOUNT_KEY, 'base64').toString());

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    console.log('='.repeat(60));
    console.log('FORM RESPONSE SHEET HEADERS ANALYSIS');
    console.log('='.repeat(60));

    for (const [formName, sheetInfo] of Object.entries(formSheets)) {
      console.log(`\n📋 ${formName.toUpperCase()} FORM:`);
      console.log(`Sheet ID: ${sheetInfo.sheetId}`);

      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetInfo.sheetId,
          range: 'A1:Z1', // Get first row (headers)
        });

        const headers = response.data.values?.[0] || [];
        console.log(`Headers found: ${headers.length}`);

        headers.forEach((header, index) => {
          console.log(`  ${index + 1}. "${header}"`);
        });

        // Look for specific patterns
        const nameHeaders = headers.filter(h => h && h.toLowerCase().includes('name'));
        const interestHeaders = headers.filter(h => h && (
          h.toLowerCase().includes('interest') ||
          h.toLowerCase().includes('program') ||
          h.toLowerCase().includes('sign up') ||
          h.toLowerCase().includes('summer')
        ));

        if (nameHeaders.length > 0) {
          console.log(`  🔍 NAME fields: ${nameHeaders.map(h => `"${h}"`).join(', ')}`);
        }
        if (interestHeaders.length > 0) {
          console.log(`  🔍 INTEREST fields: ${interestHeaders.map(h => `"${h}"`).join(', ')}`);
        }

      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('ANALYSIS COMPLETE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Failed to analyze headers:', error.message);
  }
}

getFormHeaders();