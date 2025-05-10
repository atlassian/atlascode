# Mocking API services in development and testing with WireMock

This repo contains the sample application for [Mocking API services in development and testing with WireMock](https://github.com/dockersamples/wiremock-node-docker) guide on Docker Docs. This project first demonstrates how to integrate the AccuWeather API with a Node.js server to fetch and display weather data for a given city. To simulate the weather API, you'll use WireMock that enables you to mock API responses during development and testing.


## Project Overview

This project is divided into two main steps:

**1. AccuWeather API Integration:**
- Test the integration between your Node.js server and the AccuWeather API to ensure that your server correctly makes requests to the AccuWeather API and handles the responses.

**2. Mocking with WireMock:**
- Use WireMock to mock the AccuWeather API by creating a stub response. This allows you to test your Node.js server without making actual requests to the AccuWeather API.



**Notice:** This sample repo is intended to support the guide mentioned above. As such, the application code is purposely kept simple to keep the focus on the guide's content and should not be considered production-ready.

## Tech Stack


- Node.js: A JavaScript runtime environment for building server-side applications.
- Express: A popular web application framework for Node.js.
- Axios: A promise-based HTTP client for making requests to external APIs.
- Dotenv: A zero-dependency module that loads environment variables from a `.env` file.
- WireMock: A tool for stubbing and mocking HTTP requests during testing.


## Prerequisite

- Docker Desktop
- Node (LTS version)
- AccuWeather API Key - [You will need to create a free account and download it from here](https://developer.accuweather.com/user/me/apps).


## Scenario 1: An External AccuWeather API Integration

Follow the below step to set up a Node.js application to fetch the weather data from the external AccuWeather API.


### 1. Clone the repository:

```
git clone https://github.com/dockersamples/wiremock-node-docker
```


### 2. Navigate to the `accuweather-api` directory:

```
cd accuweather-api
```


### 3. Add your AccuWeather API key

Modify `.env` file in the root directory of the accuweather-api/ directory and add your AccuWeather API key.
Keep API_ENDPOINT_BASE variable unmodified.

```
ACCUWEATHER_API_KEY=XXXXXX
API_ENDPOINT_BASE=http://dataservice.accuweather.com
```

### 5. Run the Backend API server

```
npm install
npm run start
```

You should see the following output:

```
> express-api-starter@1.2.0 start
> node src/index.js

API_ENDPOINT_BASE: http://dataservice.accuweather.com
ACCUWEATHER_API_KEY: GLC6sUXXXXXXZyzJDmyJ
Listening: http://localhost:5001
```

Keep this terminal window open.

### 6. Testing the application

Open a new terminal and run the following `curl` command to test the application:

```
curl "http://localhost:5001/api/v1/getWeather?city=Bengaluru"
```

The response should look like this:

```
{"city":"Bengaluru","temperature":22.8,"conditions":"Cloudy","forecasts":[{"date":"2024-09-07T07:00:00+05:30","temperature":83,"conditions":"Showers"},{"date":"2024-09-08T07:00:00+05:30","temperature":81,"conditions":"Thunderstorms"},{"date":"2024-09-09T07:00:00+05:30","temperature":82,"conditions":"Cloudy"},{"date":"2024-09-10T07:00:00+05:30","temperature":84,"conditions":"Cloudy"},{"date":"2024-09-11T07:00:00+05:30","temperature":82,"conditions":"Showers"}]}%
```



Before you move to the next step, switch to the old terminal where the Backend API server was running and press Ctrl+D to stop the server.


## Scenario 2: Running WireMock in a Docker container


WireMock acts as the mock API that your backend will communicate with to retrieve data. The mock API responses have already been created for you in the mappings directory.



### 1. Run the WireMock service:

Navigate to the root of the project directory and run the following command:

```
docker compose up -d
```

Verify if the WireMock container is running via Docker Dashboard.

<img width="1448" alt="image" src="https://github.com/user-attachments/assets/d5fef122-cf6a-4d33-b2bc-334da30cf56d">


### 3. Check the logs using the Docker Dashboard


<img width="1491" alt="image" src="https://github.com/user-attachments/assets/15772786-071a-4082-95eb-56b9b99d448e">


### 4. Testing the mock APIs

```
curl http://localhost:8080/api/v1/getWeather\?city\=Bengaluru
```


The response should be:

```
{"city":"Bengaluru","temperature":27.1,"conditions":"Mostly cloudy","forecasts":[{"date":"2024-09-02T07:00:00+05:30","temperature":83,"conditions":"Partly sunny w/ t-storms"},{"date":"2024-09-03T07:00:00+05:30","temperature":83,"conditions":"Thunderstorms"},{"date":"2024-09-04T07:00:00+05:30","temperature":83,"conditions":"Intermittent clouds"},{"date":"2024-09-05T07:00:00+05:30","temperature":82,"conditions":"Dreary"},{"date":"2024-09-06T07:00:00+05:30","temperature":82,"conditions":"Dreary"}]}%
```

## Scenario 3: Connecting non-containerised Nodejs to a containerised WireMock 



### 1. Navigate back to `accuweather-api` directory 


```
cd accuweather-api
```

### 2. Unset the environment variables

Just a housekeeping stuff to ensure that your environment variable is not storing the old values

```
unset API_ENDPOINT_BASE
unset ACCUWEATHER_API_KEY
```

### 3. Set the new environment variable

Remove the old entry in `.env` file and replace it with the following:

```
API_ENDPOINT_BASE=http://localhost:8080
```


### 2. Start the Node application


```
npm run start
```

You should see the following output:

```
> express-api-starter@1.2.0 start
> node src/index.js

API_ENDPOINT_BASE: http://localhost:8080
ACCUWEATHER_API_KEY: undefined
Listening: http://localhost:5001
```

### 3. Testing the Mock API

```
curl "http://localhost:5001/api/v1/getWeather?city=Bengaluru"
```

You will see the following result:

```
{"city":"Bengaluru","temperature":27.1,"conditions":"Mostly cloudy","forecasts":[{"date":"2024-09-02T07:00:00+05:30","temperature":83,"conditions":"Partly sunny w/ t-storms"},{"date":"2024-09-03T07:00:00+05:30","temperature":83,"conditions":"Thunderstorms"},{"date":"2024-09-04T07:00:00+05:30","temperature":83,"conditions":"Intermittent clouds"},{"date":"2024-09-05T07:00:00+05:30","temperature":82,"conditions":"Dreary"},{"date":"2024-09-06T07:00:00+05:30","temperature":82,"conditions":"Dreary"}]}%
```




