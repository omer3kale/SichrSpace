// 🗺️ SichrPlace Google Maps Integration
// Distance calculation to city landmarks

class LocationServices {
    constructor() {
        this.map = null;
        this.service = null;
        this.directionsService = null;
        this.directionsRenderer = null;
        this.geocoder = null;
        this.init();
    }

    async init() {
        // Load Google Maps API if not already loaded
        if (!window.google) {
            await this.loadGoogleMapsAPI();
        }
        this.initializeServices();
    }

    loadGoogleMapsAPI() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places,geometry&callback=initMap`;
            script.async = true;
            script.defer = true;
            
            window.initMap = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Google Maps API'));
            
            document.head.appendChild(script);
        });
    }

    initializeServices() {
        this.directionsService = new google.maps.DirectionsService();
        this.directionsRenderer = new google.maps.DirectionsRenderer();
        this.geocoder = new google.maps.Geocoder();
    }

    // City landmarks for major German cities
    getCityLandmarks(city) {
        const landmarks = {
            'Berlin': [
                { name: 'Brandenburg Gate', address: 'Brandenburg Gate, Berlin, Germany' },
                { name: 'Berlin Central Station', address: 'Berlin Hauptbahnhof, Berlin, Germany' },
                { name: 'Alexanderplatz', address: 'Alexanderplatz, Berlin, Germany' },
                { name: 'Potsdamer Platz', address: 'Potsdamer Platz, Berlin, Germany' },
                { name: 'Berlin Wall Memorial', address: 'Berlin Wall Memorial, Berlin, Germany' }
            ],
            'Munich': [
                { name: 'Marienplatz', address: 'Marienplatz, Munich, Germany' },
                { name: 'Munich Central Station', address: 'München Hauptbahnhof, Munich, Germany' },
                { name: 'English Garden', address: 'English Garden, Munich, Germany' },
                { name: 'Oktoberfest Grounds', address: 'Theresienwiese, Munich, Germany' },
                { name: 'BMW Museum', address: 'BMW Museum, Munich, Germany' }
            ],
            'Hamburg': [
                { name: 'Hamburg Town Hall', address: 'Hamburg Town Hall, Hamburg, Germany' },
                { name: 'Hamburg Central Station', address: 'Hamburg Hauptbahnhof, Hamburg, Germany' },
                { name: 'Speicherstadt', address: 'Speicherstadt, Hamburg, Germany' },
                { name: 'St. Pauli', address: 'St. Pauli, Hamburg, Germany' },
                { name: 'Miniatur Wunderland', address: 'Miniatur Wunderland, Hamburg, Germany' }
            ],
            'Cologne': [
                { name: 'Cologne Cathedral', address: 'Cologne Cathedral, Cologne, Germany' },
                { name: 'Cologne Central Station', address: 'Köln Hauptbahnhof, Cologne, Germany' },
                { name: 'Old Town', address: 'Altstadt, Cologne, Germany' },
                { name: 'Rhine River', address: 'Rhine Promenade, Cologne, Germany' },
                { name: 'Museum Ludwig', address: 'Museum Ludwig, Cologne, Germany' }
            ],
            'Frankfurt': [
                { name: 'Frankfurt Cathedral', address: 'Frankfurt Cathedral, Frankfurt, Germany' },
                { name: 'Frankfurt Central Station', address: 'Frankfurt Hauptbahnhof, Frankfurt, Germany' },
                { name: 'Römerberg', address: 'Römerberg, Frankfurt, Germany' },
                { name: 'Main Tower', address: 'Main Tower, Frankfurt, Germany' },
                { name: 'Palmengarten', address: 'Palmengarten, Frankfurt, Germany' }
            ],
            'Stuttgart': [
                { name: 'Stuttgart Palace', address: 'New Palace Stuttgart, Stuttgart, Germany' },
                { name: 'Stuttgart Central Station', address: 'Stuttgart Hauptbahnhof, Stuttgart, Germany' },
                { name: 'Mercedes-Benz Museum', address: 'Mercedes-Benz Museum, Stuttgart, Germany' },
                { name: 'Wilhelma Zoo', address: 'Wilhelma, Stuttgart, Germany' },
                { name: 'Königstrasse', address: 'Königstraße, Stuttgart, Germany' }
            ]
        };

        return landmarks[city] || [
            { name: 'City Center', address: `${city} City Center, Germany` },
            { name: 'Main Station', address: `${city} Hauptbahnhof, Germany` }
        ];
    }

    async calculateDistances(apartmentAddress, city) {
        const landmarks = this.getCityLandmarks(city);
        const distances = [];

        for (const landmark of landmarks) {
            try {
                const distance = await this.calculateDistance(apartmentAddress, landmark.address);
                distances.push({
                    landmark: landmark.name,
                    address: landmark.address,
                    ...distance
                });
            } catch (error) {
                console.warn(`Failed to calculate distance to ${landmark.name}:`, error);
            }
        }

        return distances;
    }

    calculateDistance(origin, destination) {
        return new Promise((resolve, reject) => {
            this.directionsService.route({
                origin: origin,
                destination: destination,
                travelMode: google.maps.TravelMode.TRANSIT,
                unitSystem: google.maps.UnitSystem.METRIC,
                avoidHighways: false,
                avoidTolls: false
            }, (response, status) => {
                if (status === 'OK') {
                    const route = response.routes[0];
                    const leg = route.legs[0];
                    
                    resolve({
                        distance: leg.distance.text,
                        duration: leg.duration.text,
                        distanceValue: leg.distance.value,
                        durationValue: leg.duration.value
                    });
                } else {
                    reject(new Error(`Directions request failed: ${status}`));
                }
            });
        });
    }

    async calculateWalkingDistance(origin, destination) {
        return new Promise((resolve, reject) => {
            this.directionsService.route({
                origin: origin,
                destination: destination,
                travelMode: google.maps.TravelMode.WALKING,
                unitSystem: google.maps.UnitSystem.METRIC
            }, (response, status) => {
                if (status === 'OK') {
                    const route = response.routes[0];
                    const leg = route.legs[0];
                    
                    resolve({
                        distance: leg.distance.text,
                        duration: leg.duration.text,
                        distanceValue: leg.distance.value,
                        durationValue: leg.duration.value
                    });
                } else {
                    reject(new Error(`Walking directions request failed: ${status}`));
                }
            });
        });
    }

    async calculateDrivingDistance(origin, destination) {
        return new Promise((resolve, reject) => {
            this.directionsService.route({
                origin: origin,
                destination: destination,
                travelMode: google.maps.TravelMode.DRIVING,
                unitSystem: google.maps.UnitSystem.METRIC
            }, (response, status) => {
                if (status === 'OK') {
                    const route = response.routes[0];
                    const leg = route.legs[0];
                    
                    resolve({
                        distance: leg.distance.text,
                        duration: leg.duration.text,
                        distanceValue: leg.distance.value,
                        durationValue: leg.duration.value
                    });
                } else {
                    reject(new Error(`Driving directions request failed: ${status}`));
                }
            });
        });
    }

    createDistanceWidget(apartmentAddress, city) {
        const widget = document.createElement('div');
        widget.className = 'distance-widget';
        widget.innerHTML = `
            <div class="distance-header">
                <h4 data-translate="apartment.location">Location & Distances</h4>
                <div class="loading-spinner">📍 Calculating distances...</div>
            </div>
            <div class="distance-content" id="distance-content">
                <!-- Distances will be populated here -->
            </div>
        `;

        // Calculate and display distances
        this.calculateDistances(apartmentAddress, city).then(distances => {
            this.displayDistances(distances, widget);
        }).catch(error => {
            console.error('Error calculating distances:', error);
            widget.querySelector('.loading-spinner').textContent = 'Unable to load distances';
        });

        return widget;
    }

    displayDistances(distances, widget) {
        const content = widget.querySelector('#distance-content');
        const spinner = widget.querySelector('.loading-spinner');
        
        spinner.style.display = 'none';

        const distanceHTML = distances.map(distance => `
            <div class="distance-item">
                <div class="landmark-info">
                    <h5>${distance.landmark}</h5>
                    <p class="landmark-address">${distance.address}</p>
                </div>
                <div class="distance-details">
                    <div class="distance-metric">
                        <span class="icon">🚌</span>
                        <span data-translate="map.transport">Public Transport</span>
                        <strong>${distance.duration} (${distance.distance})</strong>
                    </div>
                </div>
            </div>
        `).join('');

        content.innerHTML = distanceHTML;
    }

    initializeMap(containerId, apartmentLocation) {
        const mapContainer = document.getElementById(containerId);
        if (!mapContainer) return;

        this.map = new google.maps.Map(mapContainer, {
            zoom: 13,
            center: apartmentLocation,
            styles: [
                {
                    featureType: 'all',
                    elementType: 'geometry.fill',
                    stylers: [{ color: '#f5f5f5' }]
                },
                {
                    featureType: 'water',
                    elementType: 'geometry',
                    stylers: [{ color: '#e9e9e9' }, { lightness: 17 }]
                }
            ]
        });

        // Add apartment marker
        new google.maps.Marker({
            position: apartmentLocation,
            map: this.map,
            title: 'Apartment Location',
            icon: {
                url: '/img/apartment-marker.png',
                scaledSize: new google.maps.Size(40, 40)
            }
        });
    }
}

// Initialize location services
window.LocationServices = LocationServices;
