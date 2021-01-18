# Chirp
Room based chat application

This is an application which I set as a challenge to myself and built over 48hrs. It's similar to those old school chat rooms in the sense that there's public chat rooms which anyone can join and talk amongst each other. Instead of using MongoDB as my database, I decided to refamiliarize myself with SQL and use PostgreSQL. I also used Redis to help cache some information (such as online users) which I know I will need to access multiple times so instead of making a call to my database, I can grab it quickly from memory through Redis. As for the chat funcationality itself, I used Websockets since it allows me to create unique and stable connections as opposed to things like long polling.

The application can be found at: https://vi-chirp.herokuapp.com/

You can log in as a guest with the credentials

Username: guest@gmail.com
Password: 123456789
