fn main() -> Result<(), Box<dyn std::error::Error>> {
    let out_dir = std::path::PathBuf::from(std::env::var("OUT_DIR").unwrap());

    tonic_build::configure()
        .file_descriptor_set_path(out_dir.join("kioskflow_descriptor.bin"))
        .compile_protos(
            &[
                "../../../proto/common.proto",
                "../../../proto/auth.proto",
                "../../../proto/store.proto",
                "../../../proto/inventory.proto",
                "../../../proto/category.proto",
                "../../../proto/product.proto",
                "../../../proto/table.proto",
                "../../../proto/order.proto",
                "../../../proto/payment.proto",
                "../../../proto/report.proto",
                "../../../proto/status.proto",
                "../../../proto/customer.proto",
                "../../../proto/branch.proto",
                "../../../proto/ingredient.proto",
                "../../../proto/recipe.proto",
                "../../../proto/procurement.proto",
                "../../../proto/billing.proto",
                "../../../proto/table_cart.proto",
                "../../../proto/storefront.proto",
            ],
            &["../../../proto"],
        )?;
    Ok(())
}
