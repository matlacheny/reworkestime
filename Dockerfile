# Use the official Tomcat 9 image
FROM tomcat:9-jdk17

# Set environment variables
ENV CATALINA_HOME /usr/local/tomcat

# Copy your web application to the Tomcat webapps directory
COPY estime.war $CATALINA_HOME/webapps/

# Expose port 8080 for Tomcat
EXPOSE 8045

# Start Tomcat
CMD ["catalina.sh", "run"]

