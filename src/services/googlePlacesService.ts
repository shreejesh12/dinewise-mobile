import axios from 'axios';

export interface GooglePlace {
  name: string;
  place_id: string;
  rating: number;
  user_ratings_total: number;
  price_level?: number;
  vicinity: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
}

export async function searchNearbyRestaurants(apiKey: string, lat: number, lng: number, radius: number = 2000) {
  const types = ['restaurant', 'cafe', 'bakery', 'meal_takeaway'];
  let allResults: GooglePlace[] = [];

  for (const type of types) {
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
        params: {
          location: `${lat},${lng}`,
          radius,
          type,
          key: apiKey
        }
      });

      if (response.data.results) {
        allResults = [...allResults, ...response.data.results];
      }
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
    }
  }

  // Remove duplicates by place_id
  const uniqueResults = Array.from(new Map(allResults.map(item => [item.place_id, item])).values());
  return uniqueResults;
}

export async function getPlaceDetails(apiKey: string, placeId: string) {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: placeId,
        fields: 'name,rating,formatted_phone_number,opening_hours,website,photos,reviews,price_level',
        key: apiKey
      }
    });
    return response.data.result;
  } catch (error) {
    console.error('Error fetching place details:', error);
    return null;
  }
}
