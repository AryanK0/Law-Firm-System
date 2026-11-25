# ==============================================================================
# Pearson Specter Litt - Enterprise Java 21 LTS Multi-Stage Dockerfile
# ==============================================================================
FROM eclipse-temurin:21-jdk-jammy AS builder

WORKDIR /build

# Copy Maven / build descriptors and local library cache
COPY pom.xml ./
COPY lib/ ./lib/
COPY src/ ./src/

# Compile application classes
RUN mkdir -p target/classes target/dependency && \
    javac -cp "lib/*" -d target/classes $(find src/main/java -name "*.java") && \
    if [ -d "src/main/resources" ]; then cp -r src/main/resources/* target/classes/ 2>/dev/null || true; fi

# Runtime Stage
FROM eclipse-temurin:21-jre-jammy AS runner

WORKDIR /app

# Non-root user for security
RUN groupadd -g 10002 appgroup && \
    useradd -u 10002 -g appgroup -s /sbin/nologin -d /app appuser

COPY --from=builder /build/target/classes /app/target/classes
COPY --from=builder /build/lib /app/lib

RUN mkdir -p /app/storage/exports /app/storage/snapshots /app/storage/s3_vault /app/logs && \
    chown -R appuser:appgroup /app

USER appuser

ENV PORT=8085
EXPOSE 8085

CMD ["java", "-cp", "target/classes:lib/*", "com.psl.lawfirm.api.JavaRestServer"]
